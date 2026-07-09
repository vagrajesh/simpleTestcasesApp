const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 30_000;

/** Returns a masked representation of an API key safe for logging. */
function maskKey(key) {
  if (!key) return '(none)';
  if (key.length < 8) return '***';
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

/**
 * Creates a Groq provider instance.
 *
 * @param {object} config
 * @param {string} [config.model]  - Model name; falls back to DEFAULT_MODEL.
 * @param {string} [config.apiKey] - Per-request key override; falls back to GROQ_API_KEY env.
 * @returns {{ provider: string, model: string, generate: Function }}
 */
export function createGroqProvider(config = {}) {
  const apiKey = config.apiKey || process.env.GROQ_API_KEY;
  const model = (config.model && config.model.trim()) ? config.model.trim() : DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error(
      'Groq API key is missing. Set GROQ_API_KEY in server .env or provide llm.apiKey in the request.'
    );
  }

  return {
    provider: 'groq',
    model,

    async generate({ systemPrompt, userPrompt }) {
      console.log(`[groq] model=${model} key=${maskKey(apiKey)}`);
      const start = Date.now();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let response;
      try {
        response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Groq API responded with ${response.status}: ${body.slice(0, 300)}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      const latency_ms = Date.now() - start;

      console.log(`[groq] done in ${latency_ms}ms, output length=${text.length}`);
      return { text, model, latency_ms };
    },
  };
}
