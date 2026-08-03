import type { LLMConfig, LLMProviderInstance, LLMGenerateInput, LLMGenerateResult } from '@shared/types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 30_000;

interface GroqRequestBody {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature: number;
  max_tokens: number;
}

interface GroqApiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** Returns a masked representation of an API key safe for logging. */
function maskKey(key: string): string {
  if (!key) return '(none)';
  if (key.length < 8) return '***';
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

/**
 * Creates a Groq provider instance.
 *
 * @param config - Provider config; model and apiKey are optional overrides.
 * @returns LLMProviderInstance configured for Groq.
 */
export function createGroqProvider(config: Partial<LLMConfig> = {}): LLMProviderInstance {
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

    async generate({ systemPrompt, userPrompt }: LLMGenerateInput): Promise<LLMGenerateResult> {
      console.log(`[groq] model=${model} key=${maskKey(apiKey)}`);
      const requestBody: GroqRequestBody = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      };
      console.log('[groq] OUTBOUND REQUEST BODY >>>');
      console.log(JSON.stringify(requestBody, null, 2));
      console.log('[groq] <<<');
      const start = Date.now();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Groq API responded with ${response.status}: ${body.slice(0, 300)}`);
      }

      const data = await response.json() as GroqApiResponse;
      const text = data.choices?.[0]?.message?.content ?? '';
      const latency_ms = Date.now() - start;

      console.log(`[groq] done in ${latency_ms}ms, output length=${text.length}`);
      return { text, model, latency_ms };
    },
  };
}
