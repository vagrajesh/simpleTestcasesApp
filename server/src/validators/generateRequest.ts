/**
 * SSRF guard: patterns matching private / loopback / link-local hosts.
 * Blocks requests to internal infrastructure from the local provider endpoint.
 */
const PRIVATE_HOST_PATTERNS: readonly RegExp[] = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local / AWS metadata
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^localhost$/i,
];

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((p) => p.test(hostname));
}

const ALLOWED_PROVIDERS: readonly string[] = ['groq', 'openai', 'local'];
const ALLOWED_CATEGORIES: readonly string[] = ['positive', 'negative', 'edge', 'e2e'];

/**
 * Loose shape of the raw request body before validation.
 * All fields typed as unknown — the function itself proves their types at runtime.
 */
interface RawRequestBody {
  userStory?: unknown;
  llm?: {
    provider?: unknown;
    model?: unknown;
    endpoint?: unknown;
    apiKey?: unknown;
  };
  options?: {
    categories?: unknown;
  };
}

/**
 * Validates the request body for POST /api/generate-test-cases.
 * Returns an array of error strings (empty = valid).
 */
export function validateGenerateRequest(body: unknown): string[] {
  const errors: string[] = [];
  const raw = body as RawRequestBody;

  // ── userStory ────────────────────────────────────────
  if (!raw.userStory || typeof raw.userStory !== 'string') {
    errors.push('userStory is required and must be a string');
  } else if (raw.userStory.trim().length < 20) {
    errors.push('userStory must be at least 20 characters');
  } else if (raw.userStory.trim().length > 4000) {
    errors.push('userStory must not exceed 4000 characters');
  }

  // ── llm config ──────────────────────────────────────
  const llm = raw.llm ?? {};

  if (!llm.provider || !ALLOWED_PROVIDERS.includes(llm.provider as string)) {
    errors.push(`llm.provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}`);
  }

  if (llm.model !== undefined && (typeof llm.model !== 'string' || (llm.model as string).trim().length === 0)) {
    errors.push('llm.model must be a non-empty string when provided');
  }

  if (llm.provider === 'local') {
    if (!llm.endpoint) {
      errors.push('llm.endpoint is required when provider is "local"');
    } else {
      let parsedUrl: URL | undefined;
      try {
        parsedUrl = new URL(llm.endpoint as string);
      } catch {
        errors.push('llm.endpoint must be a valid URL (e.g. http://localhost:11434)');
      }

      if (parsedUrl) {
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          errors.push('llm.endpoint must use http or https protocol');
        }

        // SSRF guard — bypass with ALLOW_LOCAL_ENDPOINTS=true in dev only
        const allowLocal = process.env.ALLOW_LOCAL_ENDPOINTS === 'true';
        if (!allowLocal && isPrivateHost(parsedUrl.hostname)) {
          errors.push(
            'llm.endpoint resolves to a private/loopback address. ' +
            'Set ALLOW_LOCAL_ENDPOINTS=true in server .env to allow local LLM endpoints during development.'
          );
        }
      }
    }

    if (llm.apiKey !== undefined && typeof llm.apiKey !== 'string') {
      errors.push('llm.apiKey must be a string when provided');
    }
  }

  // ── categories ──────────────────────────────────────
  const cats = raw.options?.categories;
  if (cats !== undefined) {
    if (!Array.isArray(cats) || cats.length === 0) {
      errors.push('options.categories must be a non-empty array');
    } else {
      const invalid = (cats as unknown[]).filter((c) => !ALLOWED_CATEGORIES.includes(c as string));
      if (invalid.length > 0) {
        errors.push(
          `Invalid categories: [${(invalid as string[]).join(', ')}]. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`
        );
      }
    }
  }

  return errors;
}
