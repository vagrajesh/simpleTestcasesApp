import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PipelineCreateRequest,
  PipelinePassId,
  PipelinePassSummary,
  PipelineReviewDecision,
  PipelineReviewRecord,
  PipelineRunSummary,
} from '@shared/types';
import * as pipelineApi from '../api/pipeline';

const POLL_INTERVAL_MS = 3000;
const ACTIVE_STATUSES = new Set<PipelineRunSummary['status']>(['queued', 'running']);

interface UsePipelineRunReturn {
  pipeline: PipelineRunSummary | null;
  passes: PipelinePassSummary[];
  pendingReview: PipelineReviewRecord | null;
  loading: boolean;
  error: string | null;
  start: (request: PipelineCreateRequest) => Promise<void>;
  retryPass: (passId: PipelinePassId) => Promise<void>;
  submitReview: (decision: PipelineReviewDecision, reviewer: string, comments?: string) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

/**
 * Owns the lifecycle of a single step-by-step pipeline run: create, execute,
 * poll status while active, and surface the review gate when execution
 * pauses at a checkpoint.
 */
export function usePipelineRun(): UsePipelineRunReturn {
  const [pipeline, setPipeline] = useState<PipelineRunSummary | null>(null);
  const [passes, setPasses] = useState<PipelinePassSummary[]>([]);
  const [pendingReview, setPendingReview] = useState<PipelineReviewRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pipelineIdRef = useRef<string | null>(null);

  const syncState = useCallback(async (pipelineId: string): Promise<PipelineRunSummary> => {
    const [nextPipeline, nextPasses] = await Promise.all([
      pipelineApi.getPipelineStatus(pipelineId),
      pipelineApi.getPassList(pipelineId),
    ]);
    setPipeline(nextPipeline);
    setPasses(nextPasses);

    if (nextPipeline.status === 'waiting_review') {
      const history = await pipelineApi.getReviewHistory(pipelineId);
      setPendingReview(history.find((r) => r.status === 'pending') ?? null);
    } else {
      setPendingReview(null);
    }

    return nextPipeline;
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!pipelineIdRef.current) return;
    try {
      await syncState(pipelineIdRef.current);
    } catch (err) {
      setError((err as Error).message || 'Failed to refresh pipeline status.');
    }
  }, [syncState]);

  // Poll while a run is actively executing. With today's deterministic (non-LLM)
  // pass generators each batch resolves inside its own request, so this mostly
  // matters once real per-pass LLM calls add latency between checkpoints.
  useEffect(() => {
    if (!pipeline || !pipelineIdRef.current || !ACTIVE_STATUSES.has(pipeline.status)) return;

    const id = setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [pipeline, refresh]);

  const start = useCallback(
    async (request: PipelineCreateRequest): Promise<void> => {
      setLoading(true);
      setError(null);
      setPipeline(null);
      setPasses([]);
      setPendingReview(null);
      pipelineIdRef.current = null;

      try {
        const created = await pipelineApi.createPipeline(request);
        pipelineIdRef.current = created.pipelineId;
        setPipeline(created);

        await pipelineApi.executePipeline(created.pipelineId);
        await syncState(created.pipelineId);
      } catch (err) {
        setError((err as Error).message || 'Failed to start the pipeline run.');
      } finally {
        setLoading(false);
      }
    },
    [syncState]
  );

  const retryPass = useCallback(
    async (passId: PipelinePassId): Promise<void> => {
      if (!pipelineIdRef.current) return;
      setLoading(true);
      setError(null);
      try {
        await pipelineApi.retryPass(pipelineIdRef.current, passId);
        await syncState(pipelineIdRef.current);
      } catch (err) {
        setError((err as Error).message || 'Failed to retry pass.');
      } finally {
        setLoading(false);
      }
    },
    [syncState]
  );

  const submitReview = useCallback(
    async (decision: PipelineReviewDecision, reviewer: string, comments?: string): Promise<void> => {
      if (!pipelineIdRef.current || !pendingReview) return;
      setLoading(true);
      setError(null);
      try {
        await pipelineApi.decideReview(pendingReview.reviewId, decision, reviewer, comments);
        await syncState(pipelineIdRef.current);
      } catch (err) {
        setError((err as Error).message || 'Failed to submit review decision.');
      } finally {
        setLoading(false);
      }
    },
    [pendingReview, syncState]
  );

  const reset = useCallback((): void => {
    pipelineIdRef.current = null;
    setPipeline(null);
    setPasses([]);
    setPendingReview(null);
    setError(null);
  }, []);

  return { pipeline, passes, pendingReview, loading, error, start, retryPass, submitReview, refresh, reset };
}
