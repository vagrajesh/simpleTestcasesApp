import type {
  LLMProvider,
  PipelineCreateRequest,
  PipelinePassId,
  TestCaseCategory,
} from '@shared/types';
import { PIPELINE_PASS_CATALOG } from '../services/pipeline/catalog.js';

const PRIVATE_HOST_PATTERNS: readonly RegExp[] = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^localhost$/i,
];

const ALLOWED_PROVIDERS: readonly LLMProvider[] = ['groq', 'openai', 'local'];
const ALLOWED_CATEGORIES: readonly TestCaseCategory[] = ['positive', 'negative', 'edge', 'e2e'];
const ALLOWED_PASS_IDS = new Set<PipelinePassId>(
  PIPELINE_PASS_CATALOG.map((p) => p.passId)
);

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((p) => p.test(hostname));
}

export function validatePipelineCreateRequest(body: unknown): string[] {
  const errors: string[] = [];
  const raw = body as Partial<PipelineCreateRequest>;

  if (!raw.requirement || typeof raw.requirement !== 'object') {
    errors.push('requirement is required and must be an object');
  }

  const userStory = raw.requirement?.userStory;
  if (!userStory || typeof userStory !== 'string') {
    errors.push('requirement.userStory is required and must be a string');
  } else {
    const trimmed = userStory.trim();
    if (trimmed.length < 20) errors.push('requirement.userStory must be at least 20 characters');
    if (trimmed.length > 8000) errors.push('requirement.userStory must not exceed 8000 characters');
  }

  if (!raw.llm || typeof raw.llm !== 'object') {
    errors.push('llm is required and must be an object');
  }

  const provider = raw.llm?.provider;
  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    errors.push(`llm.provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}`);
  }

  if (raw.llm?.model !== undefined && (typeof raw.llm.model !== 'string' || raw.llm.model.trim().length === 0)) {
    errors.push('llm.model must be a non-empty string when provided');
  }

  if (provider === 'local') {
    if (!raw.llm?.endpoint || typeof raw.llm.endpoint !== 'string') {
      errors.push('llm.endpoint is required when provider is "local"');
    } else {
      let parsed: URL | null = null;
      try {
        parsed = new URL(raw.llm.endpoint);
      } catch {
        errors.push('llm.endpoint must be a valid URL (e.g. http://localhost:11434)');
      }

      if (parsed) {
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errors.push('llm.endpoint must use http or https protocol');
        }

        const allowLocal = process.env.ALLOW_LOCAL_ENDPOINTS === 'true';
        if (!allowLocal && isPrivateHost(parsed.hostname)) {
          errors.push(
            'llm.endpoint resolves to a private/loopback address. ' +
            'Set ALLOW_LOCAL_ENDPOINTS=true in server .env to allow local LLM endpoints during development.'
          );
        }
      }
    }

    if (raw.llm?.apiKey !== undefined && typeof raw.llm.apiKey !== 'string') {
      errors.push('llm.apiKey must be a string when provided');
    }
  }

  if (raw.execution?.mode !== undefined && !['step-by-step', 'all-in-one'].includes(raw.execution.mode)) {
    errors.push('execution.mode must be one of: step-by-step, all-in-one');
  }

  if (raw.execution?.autoStart !== undefined && typeof raw.execution.autoStart !== 'boolean') {
    errors.push('execution.autoStart must be a boolean when provided');
  }

  if (raw.options?.numTestCases !== undefined) {
    const n = raw.options.numTestCases;
    if (!Number.isInteger(n) || n < 1 || n > 500) {
      errors.push('options.numTestCases must be an integer between 1 and 500');
    }
  }

  if (raw.options?.categories !== undefined) {
    const categories = raw.options.categories;
    if (!Array.isArray(categories) || categories.length === 0) {
      errors.push('options.categories must be a non-empty array when provided');
    } else {
      const invalid = categories.filter((c) => !ALLOWED_CATEGORIES.includes(c));
      if (invalid.length > 0) {
        errors.push(
          `Invalid options.categories: [${invalid.join(', ')}]. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`
        );
      }
    }
  }

  if (raw.review?.enabled !== undefined && typeof raw.review.enabled !== 'boolean') {
    errors.push('review.enabled must be a boolean when provided');
  }

  if (raw.review?.checkpoints !== undefined) {
    const checkpoints = raw.review.checkpoints;
    if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
      errors.push('review.checkpoints must be a non-empty array when provided');
    } else {
      const invalid = checkpoints.filter((c) => !ALLOWED_PASS_IDS.has(c));
      if (invalid.length > 0) {
        errors.push(`Invalid review.checkpoints: [${invalid.join(', ')}]`);
      }
    }
  }

  return errors;
}
