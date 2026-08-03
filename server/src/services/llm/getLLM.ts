import type { LLMProvider, LLMConfig, LLMProviderInstance } from '@shared/types';
import { createGroqProvider } from './providers/groq.js';
import { createOpenAIProvider } from './providers/openai.js';
import { createLocalProvider } from './providers/local.js';

/**
 * Factory: returns a configured provider instance for the given provider name.
 * The switch is exhaustive over the LLMProvider union — TypeScript will error
 * if a new provider is added to the union without a corresponding case here.
 */
export function getLLM(provider: LLMProvider, config: Partial<LLMConfig> = {}): LLMProviderInstance {
  switch (provider) {
    case 'groq':
      return createGroqProvider(config);
    case 'openai':
      return createOpenAIProvider(config);
    case 'local':
      return createLocalProvider(config);
    default: {
      // Exhaustiveness check — if LLMProvider gains a new variant, this line errors at compile time
      const _exhaustive: never = provider;
      throw new Error(`Unknown LLM provider: "${_exhaustive}". Supported providers: groq, openai, local`);
    }
  }
}
