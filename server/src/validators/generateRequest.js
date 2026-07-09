/**
 * SSRF guard: patterns matching private / loopback / link-local hosts.
 * Blocks requests to internal infrastructure from the local provider endpoint.
 */
const PRIVATE_HOST_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,  // link-local / AWS metadata
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^localhost$/i,
];

function isPrivateHost(hostname) {
  return PRIVATE_HOST_PATTERNS.some((p) => p.test(hostname));
}

const ALLOWED_PROVIDERS = ['groq', 'openai', 'local'];
const ALLOWED_CATEGORIES = ['positive', 'negative', 'edge', 'e2e'];

/**
 * Validates the request body for POST /api/generate-test-cases.
 * Returns an array of error strings (empty = valid).
 */
export function validateGenerateRequest(body) {
  const errors = [];

  // ── userStory ────────────────────────────────────────
  if (!body.userStory || typeof body.userStory !== 'string') {
    errors.push('userStory is required and must be a string');
  } else if (body.userStory.trim().length < 20) {
    errors.push('userStory must be at least 20 characters');
  } else if (body.userStory.trim().length > 4000) {
    errors.push('userStory must not exceed 4000 characters');
  }

  // ── llm config ──────────────────────────────────────
  const llm = body.llm ?? {};

  if (!llm.provider || !ALLOWED_PROVIDERS.includes(llm.provider)) {
    errors.push(`llm.provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}`);
  }

  if (llm.model !== undefined && (typeof llm.model !== 'string' || llm.model.trim().length === 0)) {
    errors.push('llm.model must be a non-empty string when provided');
  }

  if (llm.provider === 'local') {
    if (!llm.endpoint) {
      errors.push('llm.endpoint is required when provider is "local"');
    } else {
      let parsedUrl;
      try {
        parsedUrl = new URL(llm.endpoint);
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
  const cats = body.options?.categories;
  if (cats !== undefined) {
    if (!Array.isArray(cats) || cats.length === 0) {
      errors.push('options.categories must be a non-empty array');
    } else {
      const invalid = cats.filter((c) => !ALLOWED_CATEGORIES.includes(c));
      if (invalid.length > 0) {
        errors.push(
          `Invalid categories: [${invalid.join(', ')}]. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`
        );
      }
    }
  }

  return errors;
}
