import { Router, type Request, type Response } from 'express';
import type { PipelineReviewDecisionRequest } from '@shared/types';
import { pipelineOrchestrator } from '../services/pipeline/orchestrator.js';

const router = Router();

/**
 * GET /api/v2/reviews/queue
 * Lists all pending review tasks across pipelines.
 */
router.get('/v2/reviews/queue', (_req: Request, res: Response) => {
  const reviews = pipelineOrchestrator.listPendingReviews();
  return res.json({ success: true, reviews });
});

/**
 * GET /api/v2/reviews/:reviewId
 * Returns details for one review task.
 */
router.get('/v2/reviews/:reviewId', (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const review = pipelineOrchestrator.getReviewById(reviewId);
  if (!review) {
    return res.status(404).json({ success: false, error: `Review not found: ${reviewId}` });
  }

  return res.json({ success: true, review });
});

/**
 * POST /api/v2/reviews/:reviewId/decision
 * Approves or rejects a review task.
 */
router.post('/v2/reviews/:reviewId/decision', async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const body = req.body as PipelineReviewDecisionRequest;

  if (!body || !body.decision || !['approve', 'reject'].includes(body.decision)) {
    return res.status(400).json({ success: false, error: 'decision must be one of: approve, reject' });
  }
  if (!body.reviewer || typeof body.reviewer !== 'string' || body.reviewer.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'reviewer is required and must be a non-empty string' });
  }
  if (body.comments !== undefined && typeof body.comments !== 'string') {
    return res.status(400).json({ success: false, error: 'comments must be a string when provided' });
  }

  try {
    const result = await pipelineOrchestrator.decideReview(
      reviewId,
      body.decision,
      body.reviewer.trim(),
      body.comments,
    );

    if (!result) {
      return res.status(404).json({ success: false, error: `Review not found: ${reviewId}` });
    }

    return res.json({
      success: true,
      review: result.review,
      pipeline: result.pipeline,
    });
  } catch (err) {
    return res.status(409).json({
      success: false,
      error: `Could not finalize review: ${(err as Error).message}`,
    });
  }
});

/**
 * GET /api/v2/pipelines/:pipelineId/review-history
 * Returns all review records for a pipeline.
 */
router.get('/v2/pipelines/:pipelineId/review-history', (req: Request, res: Response) => {
  const { pipelineId } = req.params;
  const reviews = pipelineOrchestrator.getReviewHistory(pipelineId);
  if (!reviews) {
    return res.status(404).json({ success: false, error: `Pipeline not found: ${pipelineId}` });
  }

  return res.json({ success: true, pipelineId, reviews });
});

export default router;
