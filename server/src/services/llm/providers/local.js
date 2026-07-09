const DEFAULT_MODEL = 'llama3.1:8b';
const TIMEOUT_MS = 60_000; // local models can take time to load

/** Returns a masked representation of an API key safe for logging. */
function maskKey(key) {
  if (!key) return '(none)';
  if (key.length < 8) return '***';
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

/**
 * Creates a local LLM provider (Ollama / LM Studio / any OpenAI-compatible server).
 *
 * @param {object} config
 * @param {string}  config.endpoint - Base URL, e.g. http://localhost:11434
 * @param {string} [config.model]   - Model name; falls back to DEFAULT_MODEL.
 * @param {string} [config.apiKey]  - Optional bearer token (some local servers require one).
 * @returns {{ provider: string, model: string, generate: Function }}
 */
export function createLocalProvider(config = {}) {
  const { endpoint, apiKey } = config;
  const model = (config.model && config.model.trim()) ? config.model.trim() : DEFAULT_MODEL;

  if (!endpoint) {
    throw new Error('endpoint is required for the local LLM provider');
  }

  // Normalise: strip trailing slash, append /v1/chat/completions
  const url = `${endpoint.replace(/\/+$/, '')}/v1/chat/completions`;

  return {
    provider: 'local',
    model,

    async generate({ systemPrompt, userPrompt }) {
      const logKey = apiKey ? ` key=${maskKey(apiKey)}` : '';
      console.log(`[local] POST ${url} model=${model}${logKey}`);
      const start = Date.now();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            stream: false,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Local LLM at ${endpoint} responded with ${response.status}: ${body.slice(0, 300)}`
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      const latency_ms = Date.now() - start;

      console.log(`[local] done in ${latency_ms}ms, output length=${text.length}`);
      return { text, model, latency_ms };
    },
  };
}
