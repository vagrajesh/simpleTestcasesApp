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
  // Empty string means "let the server decide" — omit model from request body
  const model = (config.model && config.model.trim()) ? config.model.trim() : null;
  // appendPath defaults to true; set to false when endpoint already includes the full path
  const appendPath = config.appendPath !== false;
  // mergePromptsToUser: combine system+user into a single user message
  // for models that ignore the system role (default: false = standard behaviour)
  const mergePromptsToUser = config.mergePromptsToUser === true;

  if (!endpoint) {
    throw new Error('endpoint is required for the local LLM provider');
  }

  const base = endpoint.replace(/\/+$/, '');
  const url = appendPath ? `${base}/v1/chat/completions` : base;

  return {
    provider: 'local',
    model,

    async generate({ systemPrompt, userPrompt }) {
      const logKey = apiKey ? ` key=${maskKey(apiKey)}` : '';
      console.log(`[local] POST ${url} model=${model ?? '(server default)'} mergePromptsToUser=${mergePromptsToUser}${logKey}`);
      const start = Date.now();

      // Build messages array based on merge strategy
      const messages = mergePromptsToUser
        ? [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }]
        : [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ];

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
            // omit model entirely when null so the server uses its own default
            ...(model ? { model } : {}),
            messages,
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
      const resolvedModel = data.model ?? model ?? 'local';

      console.log(`[local] done in ${latency_ms}ms, model=${resolvedModel}, output length=${text.length}`);
      return { text, model: resolvedModel, latency_ms };
    },
  };
}
