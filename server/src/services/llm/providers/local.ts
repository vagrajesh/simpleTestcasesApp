import type { LLMConfig, LLMProviderInstance, LLMGenerateInput, LLMGenerateResult } from '@shared/types';

const TIMEOUT_MS = 60_000; // local models can take time to load

interface LocalRequestBody {
  model?: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature: number;
  stream: false;
}

interface LocalApiResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
}

/** Returns a masked representation of an API key safe for logging. */
function maskKey(key: string): string {
  if (!key) return '(none)';
  if (key.length < 8) return '***';
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

/**
 * Creates a local LLM provider (Ollama / LM Studio / any OpenAI-compatible server).
 *
 * @param config - endpoint is required; model, apiKey, appendPath, mergePromptsToUser are optional.
 * @returns LLMProviderInstance configured for a local endpoint.
 */
export function createLocalProvider(config: Partial<LLMConfig> = {}): LLMProviderInstance {
  const { endpoint, apiKey } = config;
  // Empty string means "let the server decide" — omit model from request body
  const model: string | null = (config.model && config.model.trim()) ? config.model.trim() : null;
  // appendPath defaults to true; set to false when endpoint already includes the full path
  const appendPath: boolean = config.appendPath !== false;
  // mergePromptsToUser: combine system+user into a single user message
  // for models that ignore the system role (default: false = standard behaviour)
  const mergePromptsToUser: boolean = config.mergePromptsToUser === true;

  if (!endpoint) {
    throw new Error('endpoint is required for the local LLM provider');
  }

  const base = endpoint.replace(/\/+$/, '');
  const url = appendPath ? `${base}/v1/chat/completions` : base;

  return {
    provider: 'local',
    model: model ?? 'local',

    async generate({ systemPrompt, userPrompt }: LLMGenerateInput): Promise<LLMGenerateResult> {
      const logKey = apiKey ? ` key=${maskKey(apiKey)}` : '';
      console.log(`[local] POST ${url} model=${model ?? '(server default)'} mergePromptsToUser=${mergePromptsToUser}${logKey}`);
      const start = Date.now();

      // Build messages array based on merge strategy
      const messages: Array<{ role: 'system' | 'user'; content: string }> = mergePromptsToUser
        ? [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }]
        : [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ];

      const requestBody: LocalRequestBody = {
        ...(model ? { model } : {}),
        messages,
        temperature: 0.2,
        stream: false,
      };
      console.log('[local] OUTBOUND REQUEST BODY >>>');
      console.log(JSON.stringify(requestBody, null, 2));
      console.log('[local] <<<');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
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

      const data = await response.json() as LocalApiResponse;
      const text = data.choices?.[0]?.message?.content ?? '';
      const latency_ms = Date.now() - start;
      const resolvedModel = data.model ?? model ?? 'local';

      console.log(`[local] done in ${latency_ms}ms, model=${resolvedModel}, output length=${text.length}`);
      return { text, model: resolvedModel, latency_ms };
    },
  };
}
