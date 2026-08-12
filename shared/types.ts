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

// ─────────────────────────────────────────────
// Pipeline v2 domain (multi-pass orchestration)
// ─────────────────────────────────────────────

export type PipelineMode = 'step-by-step' | 'all-in-one';

export type PipelineRunStatus =
  | 'queued'
  | 'running'
  | 'waiting_review'
  | 'rejected'
  | 'approved'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PipelinePassStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'needs_revision'
  | 'approved';

export type PipelineReviewStatus = 'pending' | 'approved' | 'rejected';

export type PipelinePassId =
  | 'P1_REQUIREMENT_ANALYSIS'
  | 'P2_RISK_ASSESSMENT'
  | 'P3_TEST_SCENARIOS'
  | 'P4_E2E_REQUIREMENTS'
  | 'P5_TEST_PYRAMID'
  | 'P6_TM20_TEST_CASES'
  | 'P7_BULK_IMPORT'
  | 'P8_AUTOMATION_STRATEGY'
  | 'P9_RTM'
  | 'P10_COVERAGE'
  | 'P11_SELF_QA';

export interface PipelineRequirementInput {
  userStory: string;
  requirementId?: string;
  userStoryId?: string;
  epic?: string;
  feature?: string;
  acceptanceCriteria?: string[];
  contextNotes?: string;
}

export interface PipelineExecutionOptions {
  mode?: PipelineMode;
  autoStart?: boolean;
}

export interface PipelineGenerationOptions {
  numTestCases?: number;
  categories?: TestCaseCategory[];
}

export interface PipelineReviewPolicy {
  enabled?: boolean;
  checkpoints?: PipelinePassId[];
}

export interface PipelineCreateRequest {
  title?: string;
  requirement: PipelineRequirementInput;
  llm: LLMConfig;
  execution?: PipelineExecutionOptions;
  options?: PipelineGenerationOptions;
  review?: PipelineReviewPolicy;
}

export interface PipelinePassSummary {
  passId: PipelinePassId;
  name: string;
  order: number;
  status: PipelinePassStatus;
  startedAt: string | null;
  completedAt: string | null;
  attempt: number;
  error: string | null;
}

export interface PipelineRunSummary {
  pipelineId: string;
  title: string;
  status: PipelineRunStatus;
  mode: PipelineMode;
  reviewEnabled: boolean;
  progressPercent: number;
  currentPassId: PipelinePassId | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelinePassDetail extends PipelinePassSummary {
  validationErrors: string[];
  artifactType: string | null;
  artifactVersion: string | null;
}

export interface PipelineAnalysisRequirement {
  id: string;
  statement: string;
  /** Traceability back to where this requirement came from, e.g. "Story", "AC1", "AC2 (derived)". */
  source?: string;
}

export interface PipelineRequirementAnalysisArtifact {
  requirementId: string;
  userStoryId: string;
  businessProcess: string;
  actors: string[];
  functionalRequirements: PipelineAnalysisRequirement[];
  assumptions: string[];
  missingInformation: string[];
}

export interface PipelineRiskItem {
  id: string;
  category: 'Business' | 'Functional' | 'Integration' | 'Security' | 'Data' | 'Compliance' | 'Performance' | 'Operational';
  level: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  impact: string;
  likelihood: string;
  mitigation: string;
}

export interface PipelineRiskAssessmentArtifact {
  risks: PipelineRiskItem[];
}

export interface PipelineScenarioItem {
  id: string;
  title: string;
  scenarioType: 'Positive' | 'Negative' | 'Edge Cases' | 'End to End';
  businessRuleRef: string;
  objective: string;
}

export interface PipelineScenarioArtifact {
  scenarios: PipelineScenarioItem[];
}

export interface PipelineTM20Step {
  order: number;
  step: string;
  expected_result: string;
  test_data: string;
  needs_verification: boolean;
}

export interface PipelineTM20TestCase {
  short_description: string;
  description: string;
  test_type: 'Functional' | 'System' | 'Performance' | 'Integration';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  state: 'draft';
  version: '1.0';
  user_story_id: string;
  u_testing_technique: string;
  u_product_name_dept: string;
  u_business_unit: string;
  u_business_system_services: string;
  u_risk_approach: string;
  u_automated: 'Yes' | 'No';
  u_fhlbdm_test_case_id: string;
  u_module_services: string;
  steps: PipelineTM20Step[];
}

export interface PipelineTM20TestCasesArtifact {
  test_cases: PipelineTM20TestCase[];
}

export interface PipelineE2EWorkflow {
  workflowId: string;
  workflowName: string;
  businessObjective: string;
  initiatingActor: string;
  systemsInvolved: string[];
  criticalValidationPoints: string[];
  failurePoints: string[];
  recoveryPoints: string[];
}

export interface PipelineE2ERequirementsArtifact {
  workflows: PipelineE2EWorkflow[];
}

export interface PipelinePyramidDistributionArtifact {
  recommended: {
    unit: number;
    componentApi: number;
    uiE2E: number;
  };
  planned: {
    unit: number;
    componentApi: number;
    uiE2E: number;
  };
  recommendation: string;
}

export interface PipelineBulkImportRow {
  test_case_number: string;
  test_case_name: string;
  type: string;
  test_suite: string;
  requirement_id: string;
  user_story_id: string;
  business_process: string;
  priority: string;
  risk_level: string;
  test_pyramid_layer: string;
  automation_candidate: 'Yes' | 'No';
  automation_feasibility: 'High' | 'Medium' | 'Low';
  automation_priority: 'High' | 'Medium' | 'Low';
  recommended_automation_tool: string;
  preconditions: string;
  description: string;
  step_number: number;
  action: string;
  test_data: string;
  expected_result: string;
  expected_outcome: string;
}

export interface PipelineBulkImportArtifact {
  rows: PipelineBulkImportRow[];
}

export interface PipelineAutomationRecommendation {
  test_case_id: string;
  automation_candidate: 'Yes' | 'No';
  automation_feasibility: 'High' | 'Medium' | 'Low';
  automation_complexity: 'Low' | 'Medium' | 'High';
  recommended_tool: string;
  automation_roi: string;
}

export interface PipelineAutomationStrategyArtifact {
  recommendations: PipelineAutomationRecommendation[];
}

export interface PipelineRTMEntry {
  requirement_id: string;
  requirement_description: string;
  business_rule: string;
  test_scenario_id: string;
  test_case_number: string;
  coverage_status: 'Full' | 'Partial' | 'Missing';
}

export interface PipelineRTMArtifact {
  entries: PipelineRTMEntry[];
}

export interface PipelineCoverageSummaryArtifact {
  total_requirements: number;
  total_business_rules: number;
  total_test_scenarios: number;
  total_test_cases: number;
  total_e2e_test_cases: number;
  total_api_test_cases: number;
  total_integration_test_cases: number;
  total_security_test_cases: number;
  automation_candidate_count: number;
  coverage_percentage: number;
  coverage_gaps: string[];
  high_risk_areas: string[];
  missing_requirements: string[];
  uncovered_business_rules: string[];
}

export interface PipelineSelfQAValidationArtifact {
  checklist: Array<{
    id: string;
    check: string;
    status: 'PASS' | 'FAIL';
    details: string;
  }>;
  overallStatus: 'PASS' | 'FAIL';
}

export type PipelineArtifactPayload =
  | PipelineRequirementAnalysisArtifact
  | PipelineRiskAssessmentArtifact
  | PipelineScenarioArtifact
  | PipelineE2ERequirementsArtifact
  | PipelinePyramidDistributionArtifact
  | PipelineTM20TestCasesArtifact
  | PipelineBulkImportArtifact
  | PipelineAutomationStrategyArtifact
  | PipelineRTMArtifact
  | PipelineCoverageSummaryArtifact
  | PipelineSelfQAValidationArtifact;

export interface PipelineArtifactRecord {
  pipelineId: string;
  passId: PipelinePassId;
  artifactType: string;
  artifactVersion: string;
  createdAt: string;
  data: PipelineArtifactPayload;
}

export interface PipelineArtifactsListResponse {
  success: true;
  pipelineId: string;
  artifacts: Array<{
    passId: PipelinePassId;
    artifactType: string;
    artifactVersion: string;
    createdAt: string;
  }>;
}

export interface PipelineArtifactDetailResponse {
  success: true;
  pipelineId: string;
  artifact: PipelineArtifactRecord;
}

export interface PipelineCreateResponse {
  success: true;
  pipeline: PipelineRunSummary;
}

export interface PipelineStatusResponse {
  success: true;
  pipeline: PipelineRunSummary;
}

export interface PipelinePassListResponse {
  success: true;
  pipelineId: string;
  passes: PipelinePassSummary[];
}

export interface PipelinePassDetailResponse {
  success: true;
  pipelineId: string;
  pass: PipelinePassDetail;
}

export type PipelineReviewDecision = 'approve' | 'reject';

export interface PipelineReviewRecord {
  reviewId: string;
  pipelineId: string;
  passId: PipelinePassId;
  status: PipelineReviewStatus;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  reviewer: string | null;
  comments: string | null;
}

export interface PipelineReviewQueueResponse {
  success: true;
  reviews: PipelineReviewRecord[];
}

export interface PipelineReviewDetailResponse {
  success: true;
  review: PipelineReviewRecord;
}

export interface PipelineReviewDecisionRequest {
  decision: PipelineReviewDecision;
  reviewer: string;
  comments?: string;
}

export interface PipelineReviewDecisionResponse {
  success: true;
  review: PipelineReviewRecord;
  pipeline: PipelineRunSummary;
}

export interface PipelineReviewHistoryResponse {
  success: true;
  pipelineId: string;
  reviews: PipelineReviewRecord[];
}

export type PipelineRunInvocationMode = 'sync' | 'async';

export interface PipelineRunAllRequest extends PipelineCreateRequest {
  runMode?: PipelineRunInvocationMode;
}

export interface PipelineRunAllResponse {
  success: true;
  pipeline: PipelineRunSummary;
  runMode: PipelineRunInvocationMode;
}
