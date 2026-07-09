import { createGroqProvider } from './providers/groq.js';
import { createOpenAIProvider } from './providers/openai.js';
import { createLocalProvider } from './providers/local.js';

/**
 * Factory: returns a configured provider instance for the given provider name.
 *
 * @param {'groq'|'openai'|'local'} provider
 * @param {object} config - Provider-specific config (model, apiKey, endpoint…)
 * @returns {{ provider: string, model: string, generate: Function }}
 * @throws if provider is unknown or config is invalid
 */
export function getLLM(provider, config = {}) {
  switch (provider) {
    case 'groq':
      return createGroqProvider(config);
    case 'openai':
      return createOpenAIProvider(config);
    case 'local':
      return createLocalProvider(config);
    default:
      throw new Error(`Unknown LLM provider: "${provider}". Supported providers: groq, openai, local`);
  }
}
