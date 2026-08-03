import type { LLMConfig, TestCaseCategory, GenerateResponse } from '@shared/types';

const API_BASE: string = import.meta.env.VITE_API_BASE || '';

interface GenerateParams {
  userStory: string;
  categories: TestCaseCategory[];
  llmConfig: LLMConfig;
}

/**
 * Calls POST /api/generate-test-cases on the backend.
 */
export async function generateTestCases({ userStory, categories, llmConfig }: GenerateParams): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/api/generate-test-cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userStory,
      options: { categories },
      llm: {
        provider: llmConfig.provider,
        model: llmConfig.model,
        // only include these when relevant
        ...(llmConfig.provider === 'local' && {
          endpoint: llmConfig.endpoint,
          appendPath: llmConfig.appendPath !== false,
          mergePromptsToUser: llmConfig.mergePromptsToUser === true,
          ...(llmConfig.apiKey ? { apiKey: llmConfig.apiKey } : {}),
        }),
      },
    }),
  });

  // All structured error responses (400/502/504) return JSON; surface them via data.error
  // Only treat truly unexpected HTTP failures as thrown errors
  if (!response.ok && response.status >= 500 && response.status !== 502 && response.status !== 504) {
    throw new Error(`Unexpected server error: HTTP ${response.status}`);
  }

  const data = await response.json() as GenerateResponse;
  return data;
}
