import { Router, type Request, type Response } from 'express';
import type {
  PipelineCreateRequest,
  PipelinePassId,
  PipelineRunAllRequest,
} from '@shared/types';
import { pipelineOrchestrator } from '../services/pipeline/orchestrator.js';
import { validatePipelineCreateRequest } from '../validators/pipelineRequest.js';

const router = Router();

/**
 * POST /api/v2/pipelines
 * Creates a pipeline run and initializes all pass states.
 */
router.post('/v2/pipelines', (req: Request, res: Response) => {
  const errors = validatePipelineCreateRequest(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; ') });
  }

  const request = req.body as PipelineCreateRequest;
  const pipeline = pipelineOrchestrator.createRun(request);

  if (request.execution?.autoStart) {
    pipelineOrchestrator.executeRun(pipeline.pipelineId).catch((err) => {
      console.error(`[pipeline] autoStart failed for ${pipeline.pipelineId}:`, (err as Error).message);
    });
  }

  return res.status(201).json({
    success: true,
    pipeline,
  });
});

/**
 * POST /api/v2/pipelines/run-all
 * Creates and runs an all-in-one pipeline in sync or async mode.
 */
router.post('/v2/pipelines/run-all', async (req: Request, res: Response) => {
  const body = req.body as PipelineRunAllRequest;
  const errors = validatePipelineCreateRequest(body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; ') });
  }

  const runMode = body.runMode ?? 'sync';
  if (!['sync', 'async'].includes(runMode)) {
    return res.status(400).json({ success: false, error: 'runMode must be one of: sync, async' });
  }

  const pipelineRequest: PipelineCreateRequest = {
    ...body,
    execution: {
      ...body.execution,
      mode: 'all-in-one',
      autoStart: false,
    },
  };

  const pipeline = pipelineOrchestrator.createRun(pipelineRequest);

  if (runMode === 'async') {
    pipelineOrchestrator.executeRun(pipeline.pipelineId).catch((err) => {
      console.error(`[pipeline] run-all async failed for ${pipeline.pipelineId}:`, (err as Error).message);
    });

    return res.status(202).json({
      success: true,
      pipeline,
      runMode,
    });
  }

  try {
    await pipelineOrchestrator.executeRun(pipeline.pipelineId);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `run-all failed: ${(err as Error).message}`,
    });
  }

  const updated = pipelineOrchestrator.getRunSummary(pipeline.pipelineId);
  return res.json({
    success: true,
    pipeline: updated,
    runMode,
  });
});

/**
 * GET /api/v2/pipelines/:pipelineId
 * Returns run-level status and progress summary.
 */
router.get('/v2/pipelines/:pipelineId', (req: Request, res: Response) => {
  const { pipelineId } = req.params;
  const pipeline = pipelineOrchestrator.getRunSummary(pipelineId);

  if (!pipeline) {
    return res.status(404).json({ success: false, error: `Pipeline not found: ${pipelineId}` });
  }

  return res.json({ success: true, pipeline });
});

/**
 * GET /api/v2/pipelines/:pipelineId/passes
 * Returns pass list with status for each phase.
 */
router.get('/v2/pipelines/:pipelineId/passes', (req: Request, res: Response) => {
  const { pipelineId } = req.params;
  const passes = pipelineOrchestrator.getPassList(pipelineId);

  if (!passes) {
    return res.status(404).json({ success: false, error: `Pipeline not found: ${pipelineId}` });
  }

  return res.json({ success: true, pipelineId, passes });
});

/**
 * GET /api/v2/pipelines/:pipelineId/passes/:passId
 * Returns detailed status for a specific pass.
 */
router.get('/v2/pipelines/:pipelineId/passes/:passId', (req: Request, res: Response) => {
  const { pipelineId, passId } = req.params;
  const pass = pipelineOrchestrator.getPassDetail(pipelineId, passId as PipelinePassId);

  if (!pass) {
    return res.status(404).json({
      success: false,
      error: `Pass not found: ${passId} for pipeline ${pipelineId}`,
    });
  }

  return res.json({ success: true, pipelineId, pass });
});

/**
 * POST /api/v2/pipelines/:pipelineId/execute
 * Executes the Phase 2 core pass sequence.
 */
router.post('/v2/pipelines/:pipelineId/execute', async (req: Request, res: Response) => {
  const { pipelineId } = req.params;

  const existing = pipelineOrchestrator.getRunSummary(pipelineId);
  if (!existing) {
    return res.status(404).json({ success: false, error: `Pipeline not found: ${pipelineId}` });
  }

  try {
    await pipelineOrchestrator.executeRun(pipelineId);
  } catch (err) {
    return res.status(500).json({ success: false, error: `Execution failed: ${(err as Error).message}` });
  }

  const updated = pipelineOrchestrator.getRunSummary(pipelineId);
  return res.json({ success: true, pipeline: updated });
});

/**
 * POST /api/v2/pipelines/:pipelineId/resume
 * Resumes a queued/rejected/approved pipeline from the next runnable pass.
 */
router.post('/v2/pipelines/:pipelineId/resume', async (req: Request, res: Response) => {
  const { pipelineId } = req.params;

  try {
    const updated = await pipelineOrchestrator.resumeRun(pipelineId);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Pipeline not found: ${pipelineId}` });
    }
    return res.json({ success: true, pipeline: updated });
  } catch (err) {
    return res.status(409).json({
      success: false,
      error: `Could not resume pipeline: ${(err as Error).message}`,
    });
  }
});

/**
 * POST /api/v2/pipelines/:pipelineId/passes/:passId/retry
 * Retries the selected pass and downstream Phase 2 passes.
 */
router.post('/v2/pipelines/:pipelineId/passes/:passId/retry', async (req: Request, res: Response) => {
  const { pipelineId, passId } = req.params;

  try {
    const updated = await pipelineOrchestrator.retryPassFrom(pipelineId, passId as PipelinePassId);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Retry target not found or pass is not executable: ${passId}`,
      });
    }
    return res.json({ success: true, pipeline: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: `Retry failed: ${(err as Error).message}` });
  }
});

export default router;
