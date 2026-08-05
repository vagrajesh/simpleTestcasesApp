import type {
  PipelineArtifactDetailResponse,
  PipelineArtifactRecord,
  PipelineArtifactsListResponse,
  PipelineCreateRequest,
  PipelineCreateResponse,
  PipelinePassDetail,
  PipelinePassDetailResponse,
  PipelinePassId,
  PipelinePassListResponse,
  PipelinePassSummary,
  PipelineReviewDecision,
  PipelineReviewDecisionResponse,
  PipelineReviewHistoryResponse,
  PipelineReviewRecord,
  PipelineRunSummary,
  PipelineStatusResponse,
} from '@shared/types';

const API_BASE: string = import.meta.env.VITE_API_BASE || '';

interface ApiError {
  success: false;
  error: string;
}

/**
 * Shared fetch wrapper for the v2 pipeline API. Every endpoint returns either
 * `{ success: true, ... }` or `{ success: false, error }` — unwrap to the
 * success payload or throw the server's error message.
 */
async function request<T extends { success: true }>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const data = (await response.json()) as T | ApiError;
  if (!data.success) {
    throw new Error(data.error || `Request failed: HTTP ${response.status}`);
  }
  return data;
}

/** POST /api/v2/pipelines */
export function createPipeline(body: PipelineCreateRequest): Promise<PipelineRunSummary> {
  return request<PipelineCreateResponse>('/v2/pipelines', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((data) => data.pipeline);
}

/** POST /api/v2/pipelines/:pipelineId/execute */
export function executePipeline(pipelineId: string): Promise<PipelineRunSummary> {
  return request<PipelineStatusResponse>(`/v2/pipelines/${pipelineId}/execute`, {
    method: 'POST',
  }).then((data) => data.pipeline);
}

/** GET /api/v2/pipelines/:pipelineId */
export function getPipelineStatus(pipelineId: string): Promise<PipelineRunSummary> {
  return request<PipelineStatusResponse>(`/v2/pipelines/${pipelineId}`).then((data) => data.pipeline);
}

/** GET /api/v2/pipelines/:pipelineId/passes */
export function getPassList(pipelineId: string): Promise<PipelinePassSummary[]> {
  return request<PipelinePassListResponse>(`/v2/pipelines/${pipelineId}/passes`).then((data) => data.passes);
}

/** GET /api/v2/pipelines/:pipelineId/passes/:passId */
export function getPassDetail(pipelineId: string, passId: PipelinePassId): Promise<PipelinePassDetail> {
  return request<PipelinePassDetailResponse>(`/v2/pipelines/${pipelineId}/passes/${passId}`).then((data) => data.pass);
}

/** POST /api/v2/pipelines/:pipelineId/passes/:passId/retry */
export function retryPass(pipelineId: string, passId: PipelinePassId): Promise<PipelineRunSummary> {
  return request<PipelineStatusResponse>(`/v2/pipelines/${pipelineId}/passes/${passId}/retry`, {
    method: 'POST',
  }).then((data) => data.pipeline);
}

/** POST /api/v2/pipelines/:pipelineId/resume */
export function resumePipeline(pipelineId: string): Promise<PipelineRunSummary> {
  return request<PipelineStatusResponse>(`/v2/pipelines/${pipelineId}/resume`, {
    method: 'POST',
  }).then((data) => data.pipeline);
}

/** GET /api/v2/pipelines/:pipelineId/artifacts */
export function getArtifactsList(pipelineId: string): Promise<PipelineArtifactsListResponse['artifacts']> {
  return request<PipelineArtifactsListResponse>(`/v2/pipelines/${pipelineId}/artifacts`).then((data) => data.artifacts);
}

/** GET /api/v2/pipelines/:pipelineId/artifacts/:passId */
export function getArtifact(pipelineId: string, passId: PipelinePassId): Promise<PipelineArtifactRecord> {
  return request<PipelineArtifactDetailResponse>(`/v2/pipelines/${pipelineId}/artifacts/${passId}`).then(
    (data) => data.artifact
  );
}

/** GET /api/v2/pipelines/:pipelineId/review-history */
export function getReviewHistory(pipelineId: string): Promise<PipelineReviewRecord[]> {
  return request<PipelineReviewHistoryResponse>(`/v2/pipelines/${pipelineId}/review-history`).then(
    (data) => data.reviews
  );
}

/** POST /api/v2/reviews/:reviewId/decision */
export function decideReview(
  reviewId: string,
  decision: PipelineReviewDecision,
  reviewer: string,
  comments?: string
): Promise<{ review: PipelineReviewRecord; pipeline: PipelineRunSummary }> {
  return request<PipelineReviewDecisionResponse>(`/v2/reviews/${reviewId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, reviewer, comments }),
  }).then((data) => ({ review: data.review, pipeline: data.pipeline }));
}
