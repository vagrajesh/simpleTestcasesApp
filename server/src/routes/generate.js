import { Router } from 'express';
import { validateGenerateRequest } from '../validators/generateRequest.js';
import { getLLM } from '../services/llm/getLLM.js';
import { SYSTEM_PROMPT } from '../services/llm/prompts/systemPrompt.js';

const router = Router();

const DEFAULT_CATEGORIES = ['positive', 'negative', 'edge', 'e2e'];

/** Builds the user-facing prompt injected alongside the system prompt. */
function buildUserPrompt(userStory, categories) {
  return (
    `Generate test cases for the following user story:\n\n` +
    `"${userStory}"\n\n` +
    `Categories to generate: ${categories.join(', ')}\n\n` +
    `Return ONLY the JSON object. No markdown, no explanation.`
  );
}

/**
 * Strips markdown code fences the model may wrap around JSON,
 * then parses and validates the structure.
 */
function parseAndValidateLLMResponse(raw) {
  // Strip ```json ... ``` or ``` ... ``` wrappers
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

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

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `LLM returned invalid JSON — ${err.message}. ` +
      `First 400 chars of output: ${stripped.slice(0, 400)}`
    );
  }

  if (!Array.isArray(parsed.testCases)) {
    throw new Error('LLM response is missing the "testCases" array');
  }

  const REQUIRED_FIELDS = ['id', 'category', 'title', 'preconditions', 'steps', 'expectedResult', 'priority'];
  for (const [i, tc] of parsed.testCases.entries()) {
    for (const field of REQUIRED_FIELDS) {
      if (tc[field] === undefined || tc[field] === null) {
        throw new Error(`testCases[${i}] is missing required field "${field}"`);
      }
    }
    if (!Array.isArray(tc.steps)) {
      throw new Error(`testCases[${i}].steps must be an array`);
    }
  }

  return parsed.testCases;
}

// ─────────────────────────────────────────────────────────
// POST /api/generate-test-cases
// ─────────────────────────────────────────────────────────
router.post('/generate-test-cases', async (req, res) => {
  // 1. Validate request body
  const errors = validateGenerateRequest(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; ') });
  }

  const { userStory, options = {}, llm: llmConfig = {} } = req.body;
  const categories = options.categories ?? DEFAULT_CATEGORIES;

  // 2. Instantiate provider
  let provider;
  try {
    provider = getLLM(llmConfig.provider, {
      model: llmConfig.model,
      apiKey: llmConfig.apiKey,
      endpoint: llmConfig.endpoint,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }

  // 3. Call LLM
  const userPrompt = buildUserPrompt(userStory.trim(), categories);
  let llmResult;
  try {
    llmResult = await provider.generate({ systemPrompt: SYSTEM_PROMPT, userPrompt });
  } catch (err) {
    const isTimeout = err.name === 'AbortError' || /abort/i.test(err.message);
    if (isTimeout) {
      return res.status(504).json({
        success: false,
        error: 'LLM request timed out. The model may still be loading — please try again.',
      });
    }
    return res.status(502).json({
      success: false,
      error: `LLM call failed: ${err.message}`,
    });
  }

  // 4. Parse + validate JSON from LLM
  console.log('[generate] RAW LLM OUTPUT >>>\n', llmResult.text, '\n<<<');
  let testCases;
  try {
    testCases = parseAndValidateLLMResponse(llmResult.text);
  } catch (err) {
    console.error('[generate] parse error:', err.message);
    return res.status(502).json({
      success: false,
      error: `Could not parse LLM response: ${err.message}`,
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
