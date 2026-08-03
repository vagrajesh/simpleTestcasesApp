import { Router, type Request, type Response } from 'express';
import type { TestCase, TestCaseCategory, LLMProvider, LLMConfig } from '@shared/types';
import { validateGenerateRequest } from '../validators/generateRequest.js';
import { getLLM } from '../services/llm/getLLM.js';
import { SYSTEM_PROMPT } from '../services/llm/prompts/systemPrompt.js';

const router = Router();

const DEFAULT_CATEGORIES: TestCaseCategory[] = ['positive', 'negative', 'edge', 'e2e'];

/** Builds the user-facing prompt injected alongside the system prompt. */
function buildUserPrompt(userStory: string, categories: TestCaseCategory[]): string {
  return (
    `Generate test cases for the following user story:\n\n` +
    `"${userStory}"\n\n` +
    `Categories to generate: ${categories.join(', ')}\n\n` +
    `Return ONLY the JSON object. No markdown, no explanation.`
  );
}

/**
 * Raw shape returned by JSON.parse — all fields unknown until validated.
 */
interface RawLLMResponse {
  testCases?: unknown[];
}

/**
 * Strips markdown code fences the model may wrap around JSON,
 * then parses and validates the structure.
 * Returns a typed TestCase array or throws a descriptive error.
 */
function parseAndValidateLLMResponse(raw: string): TestCase[] {
  // Strip ```json ... ``` or ``` ... ``` wrappers
  let stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // Reasoning models emit a chain-of-thought (which may itself contain a
  // draft JSON block) before the real answer, closed by a </think> tag.
  // Discard everything up to the last such tag so only the final answer remains.
  const thinkEnd = stripped.lastIndexOf('</think>');
  if (thinkEnd !== -1) {
    stripped = stripped.slice(thinkEnd + '</think>'.length).trim();
  }

  // Extract the JSON object by finding the first { and last }
  // This tolerates preamble/trailing prose from non-compliant models
  const jsonStart = stripped.indexOf('{');
  const jsonEnd   = stripped.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(
      `LLM response contains no JSON object. First 400 chars: ${stripped.slice(0, 400)}`
    );
  }

  const cleaned = stripped.slice(jsonStart, jsonEnd + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `LLM returned invalid JSON — ${(err as Error).message}. ` +
      `First 400 chars of output: ${stripped.slice(0, 400)}`
    );
  }

  const response = parsed as RawLLMResponse;

  if (!Array.isArray(response.testCases)) {
    throw new Error('LLM response is missing the "testCases" array');
  }

  const REQUIRED_FIELDS: (keyof TestCase)[] = [
    'id', 'category', 'title', 'preconditions', 'steps', 'expectedResult', 'priority',
  ];

  for (const [i, tc] of response.testCases.entries()) {
    const testCase = tc as Record<string, unknown>;
    for (const field of REQUIRED_FIELDS) {
      if (testCase[field] === undefined || testCase[field] === null) {
        throw new Error(`testCases[${i}] is missing required field "${field}"`);
      }
    }
    if (!Array.isArray(testCase['steps'])) {
      throw new Error(`testCases[${i}].steps must be an array`);
    }
  }

  return response.testCases as TestCase[];
}

// ─────────────────────────────────────────────────────────
// POST /api/generate-test-cases
// ─────────────────────────────────────────────────────────
router.post('/generate-test-cases', async (req: Request, res: Response) => {
  // 1. Validate request body
  const errors = validateGenerateRequest(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; ') });
  }

  const body = req.body as {
    userStory: string;
    options?: { categories?: TestCaseCategory[] };
    llm: Pick<LLMConfig, 'provider' | 'model' | 'apiKey' | 'endpoint'> & { provider: LLMProvider };
  };

  const { userStory, options = {}, llm: llmConfig } = body;
  const categories: TestCaseCategory[] = options.categories ?? DEFAULT_CATEGORIES;

  // 2. Instantiate provider
  let provider;
  try {
    provider = getLLM(llmConfig.provider, {
      model: llmConfig.model,
      apiKey: llmConfig.apiKey,
      endpoint: llmConfig.endpoint,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: (err as Error).message });
  }

  // 3. Call LLM
  const userPrompt = buildUserPrompt(userStory.trim(), categories);
  let llmResult;
  try {
    llmResult = await provider.generate({ systemPrompt: SYSTEM_PROMPT, userPrompt });
  } catch (err) {
    const error = err as Error;
    const isTimeout = error.name === 'AbortError' || /abort/i.test(error.message);
    if (isTimeout) {
      return res.status(504).json({
        success: false,
        error: 'LLM request timed out. The model may still be loading — please try again.',
      });
    }
    return res.status(502).json({
      success: false,
      error: `LLM call failed: ${error.message}`,
    });
  }

  // 4. Parse + validate JSON from LLM
  console.log('[generate] RAW LLM OUTPUT >>>\n', llmResult.text, '\n<<<');
  let testCases: TestCase[];
  try {
    testCases = parseAndValidateLLMResponse(llmResult.text);
  } catch (err) {
    console.error('[generate] parse error:', (err as Error).message);
    return res.status(502).json({
      success: false,
      error: `Could not parse LLM response: ${(err as Error).message}`,
    });
  }

  // 5. Return structured response
  return res.json({
    success: true,
    testCases,
    provider_used: provider.provider,
    model_used: llmResult.model,
    latency_ms: llmResult.latency_ms,
  });
});

export default router;
