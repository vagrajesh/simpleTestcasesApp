/**
 * Shared domain types for the Test Case Generator.
 *
 * Imported by both server (server/src/) and client (client/src/).
 * These are the single source of truth — do NOT redefine locally.
 */

// ─────────────────────────────────────────────
// Core domain
// ─────────────────────────────────────────────

export type LLMProvider = 'groq' | 'openai' | 'local';

export type TestCaseCategory = 'positive' | 'negative' | 'edge' | 'e2e';

export type Priority = 'High' | 'Medium' | 'Low';

export interface TestCase {
  id: string;
  category: TestCaseCategory;
  title: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  priority: Priority;
}

// ─────────────────────────────────────────────
// LLM configuration (sent from client → server)
// ─────────────────────────────────────────────

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  apiKey?: string;
  /** Local provider only — base URL of the LLM endpoint */
  endpoint?: string;
  /** Local provider only — whether to append /v1/chat/completions to endpoint (default true) */
  appendPath?: boolean;
  /** Local provider only — merge system + user prompts into one user message (default false) */
  mergePromptsToUser?: boolean;
}

// ─────────────────────────────────────────────
// HTTP request / response shapes
// ─────────────────────────────────────────────

export interface GenerateRequestOptions {
  categories?: TestCaseCategory[];
}

export interface GenerateRequest {
  userStory: string;
  options?: GenerateRequestOptions;
  llm: LLMConfig;
}

/** Successful response from POST /api/generate-test-cases */
export interface GenerateSuccessResponse {
  success: true;
  testCases: TestCase[];
  /** Provider that handled the request (e.g. 'groq') */
  provider_used: string;
  /** Model name returned by the provider */
  model_used: string;
  /** End-to-end latency in milliseconds */
  latency_ms: number;
}

/** Error response from any endpoint */
export interface GenerateErrorResponse {
  success: false;
  error: string;
}

export type GenerateResponse = GenerateSuccessResponse | GenerateErrorResponse;

// ─────────────────────────────────────────────
// ResultsPanel meta shape (mapped in App.tsx)
// ─────────────────────────────────────────────

export interface ResultsMeta {
  provider: string;
  model: string;
  latency: number;
}

// ─────────────────────────────────────────────
// LLM provider interface (server-side)
// ─────────────────────────────────────────────

export interface LLMGenerateInput {
  systemPrompt: string;
  userPrompt: string;
}

export interface LLMGenerateResult {
  text: string;
  model: string;
  latency_ms: number;
}

export interface LLMProviderInstance {
  provider: string;
  model: string;
  generate(input: LLMGenerateInput): Promise<LLMGenerateResult>;
}
