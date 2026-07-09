const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Calls POST /api/generate-test-cases on the backend.
 *
 * @param {{ userStory: string, categories: string[], llmConfig: object }} params
 * @returns {Promise<object>} parsed JSON response
 */
export async function generateTestCases({ userStory, categories, llmConfig }) {
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

  const data = await response.json();
  return data;
}
