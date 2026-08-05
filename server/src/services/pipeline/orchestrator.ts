import { randomUUID } from 'node:crypto';
import type {
  PipelineAutomationStrategyArtifact,
  PipelineArtifactRecord,
  PipelineArtifactsListResponse,
  PipelineArtifactDetailResponse,
  PipelineBulkImportArtifact,
  PipelineCoverageSummaryArtifact,
  PipelineCreateRequest,
  PipelineE2ERequirementsArtifact,
  PipelinePyramidDistributionArtifact,
  PipelineReviewDecision,
  PipelineReviewRecord,
  PipelinePassDetail,
  PipelinePassId,
  PipelinePassSummary,
  PipelineRiskAssessmentArtifact,
  PipelineRTMArtifact,
  PipelineReviewStatus,
  PipelineRunSummary,
  PipelineRequirementAnalysisArtifact,
  PipelineScenarioArtifact,
  PipelineTM20TestCasesArtifact,
} from '@shared/types';
import { DEFAULT_REVIEW_CHECKPOINTS, PIPELINE_PASS_CATALOG } from './catalog.js';
import {
  InMemoryPipelineStore,
  type PipelinePassRecord,
  type PipelineRunRecord,
  type PipelineStore,
  toPipelinePassDetail,
  toPipelineRunSummary,
} from './store.js';
import { executeCorePass, validateCorePassArtifact } from './passExecutors.js';

const FULL_PIPELINE_PASSES: PipelinePassId[] = [
  'P1_REQUIREMENT_ANALYSIS',
  'P2_RISK_ASSESSMENT',
  'P3_TEST_SCENARIOS',
  'P4_E2E_REQUIREMENTS',
  'P5_TEST_PYRAMID',
  'P6_TM20_TEST_CASES',
  'P7_BULK_IMPORT',
  'P8_AUTOMATION_STRATEGY',
  'P9_RTM',
  'P10_COVERAGE',
  'P11_SELF_QA',
];

const MAX_PASS_RETRIES = 2;

function isReviewCheckpoint(run: PipelineRunRecord, passId: PipelinePassId): boolean {
  if (!run.reviewEnabled) return false;
  const checkpoints = run.request.review?.checkpoints ?? DEFAULT_REVIEW_CHECKPOINTS;
  return checkpoints.includes(passId);
}

function nextExecutablePassId(run: PipelineRunRecord, passId: PipelinePassId): PipelinePassId | null {
  const idx = run.executablePassIds.indexOf(passId);
  if (idx === -1) return null;
  return run.executablePassIds[idx + 1] ?? null;
}

export class PipelineOrchestrator {
  constructor(private readonly store: PipelineStore) {}

  createRun(request: PipelineCreateRequest): PipelineRunSummary {
    const now = new Date().toISOString();
    const pipelineId = randomUUID();
    const mode = request.execution?.mode ?? 'step-by-step';
    const reviewEnabled = request.review?.enabled ?? true;

    const passes: PipelinePassRecord[] = PIPELINE_PASS_CATALOG.map((item) => ({
      passId: item.passId,
      name: item.name,
      order: item.order,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      attempt: 0,
      error: null,
      validationErrors: [],
      artifactType: null,
      artifactVersion: null,
    }));

    const title = (request.title && request.title.trim())
      ? request.title.trim()
      : `Pipeline ${pipelineId.slice(0, 8)}`;

    const run: PipelineRunRecord = {
      pipelineId,
      title,
      status: 'queued',
      mode,
      reviewEnabled,
      currentPassId: null,
      createdAt: now,
      updatedAt: now,
      request: {
        ...request,
        review: {
          enabled: reviewEnabled,
          checkpoints: request.review?.checkpoints ?? DEFAULT_REVIEW_CHECKPOINTS,
        },
      },
      executablePassIds: FULL_PIPELINE_PASSES,
      passes,
      reviews: [],
      artifacts: {},
    };

    this.store.insert(run);
    return toPipelineRunSummary(run);
  }

  getRunSummary(pipelineId: string): PipelineRunSummary | null {
    const run = this.store.get(pipelineId);
    if (!run) return null;
    return toPipelineRunSummary(run);
  }

  getPassList(pipelineId: string): PipelinePassSummary[] | null {
    const run = this.store.get(pipelineId);
    if (!run) return null;
    return run.passes.map((pass) => ({
      passId: pass.passId,
      name: pass.name,
      order: pass.order,
      status: pass.status,
      startedAt: pass.startedAt,
      completedAt: pass.completedAt,
      attempt: pass.attempt,
      error: pass.error,
    }));
  }

  getPassDetail(pipelineId: string, passId: PipelinePassId): PipelinePassDetail | null {
    const run = this.store.get(pipelineId);
    if (!run) return null;
    const pass = run.passes.find((p) => p.passId === passId);
    if (!pass) return null;
    return toPipelinePassDetail(pass);
  }

  getArtifacts(pipelineId: string): PipelineArtifactsListResponse | null {
    const run = this.store.get(pipelineId);
    if (!run) return null;

    const artifacts = Object.entries(run.artifacts)
      .filter((entry): entry is [PipelinePassId, NonNullable<PipelineRunRecord['artifacts'][PipelinePassId]>] => Boolean(entry[1]))
      .map(([passId, artifact]) => ({
        passId,
        artifactType: artifact.artifactType,
        artifactVersion: artifact.artifactVersion,
        createdAt: artifact.createdAt,
      }));

    return {
      success: true,
      pipelineId,
      artifacts,
    };
  }

  getArtifactByPass(pipelineId: string, passId: PipelinePassId): PipelineArtifactDetailResponse | null {
    const run = this.store.get(pipelineId);
    if (!run) return null;

    const artifact = run.artifacts[passId];
    if (!artifact) return null;

    const record: PipelineArtifactRecord = {
      pipelineId,
      passId,
      artifactType: artifact.artifactType,
      artifactVersion: artifact.artifactVersion,
      createdAt: artifact.createdAt,
      data: artifact.data,
    };

    return {
      success: true,
      pipelineId,
      artifact: record,
    };
  }

  listPendingReviews(): PipelineReviewRecord[] {
    return this.store
      .list()
      .flatMap((run) => run.reviews)
      .filter((review) => review.status === 'pending')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getReviewById(reviewId: string): PipelineReviewRecord | null {
    for (const run of this.store.list()) {
      const review = run.reviews.find((r) => r.reviewId === reviewId);
      if (review) return review;
    }
    return null;
  }

  getReviewHistory(pipelineId: string): PipelineReviewRecord[] | null {
    const run = this.store.get(pipelineId);
    if (!run) return null;
    return [...run.reviews].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async resumeRun(pipelineId: string): Promise<PipelineRunSummary | null> {
    const run = this.store.get(pipelineId);
    if (!run) return null;

    const pendingReview = run.reviews.find((r) => r.status === 'pending');
    if (pendingReview) {
      throw new Error(
        `Pipeline ${pipelineId} is waiting for review ${pendingReview.reviewId} on pass ${pendingReview.passId}`
      );
    }

    if (run.status === 'completed') {
      return toPipelineRunSummary(run);
    }

    const nextPass = run.executablePassIds.find((id) => {
      const pass = run.passes.find((p) => p.passId === id);
      return pass?.status === 'pending' || pass?.status === 'needs_revision';
    });

    if (!nextPass) {
      run.status = 'completed';
      run.currentPassId = null;
      run.updatedAt = new Date().toISOString();
      this.store.update(run);
      return toPipelineRunSummary(run);
    }

    await this.executeRun(pipelineId, { startFromPassId: nextPass });
    return toPipelineRunSummary(this.store.get(pipelineId)!);
  }

  async decideReview(
    reviewId: string,
    decision: PipelineReviewDecision,
    reviewer: string,
    comments?: string,
  ): Promise<{ review: PipelineReviewRecord; pipeline: PipelineRunSummary } | null> {
    let ownerRun: PipelineRunRecord | null = null;
    let targetReview: PipelineReviewRecord | null = null;

    for (const run of this.store.list()) {
      const found = run.reviews.find((r) => r.reviewId === reviewId);
      if (found) {
        ownerRun = run;
        targetReview = found;
        break;
      }
    }

    if (!ownerRun || !targetReview) return null;
    if (targetReview.status !== 'pending') {
      throw new Error(`Review ${reviewId} is already finalized with status ${targetReview.status}`);
    }

    const now = new Date().toISOString();
    targetReview.reviewer = reviewer;
    targetReview.comments = comments ?? null;
    targetReview.decidedAt = now;
    targetReview.updatedAt = now;
    targetReview.status = decision === 'approve' ? 'approved' : 'rejected';

    const reviewedPass = ownerRun.passes.find((p) => p.passId === targetReview.passId);
    if (!reviewedPass) {
      throw new Error(`Reviewed pass ${targetReview.passId} not found in pipeline ${ownerRun.pipelineId}`);
    }

    if (decision === 'reject') {
      reviewedPass.status = 'needs_revision';
      reviewedPass.error = comments ?? 'Rejected in Human-in-Review';
      ownerRun.status = 'rejected';
      ownerRun.currentPassId = targetReview.passId;

      const start = ownerRun.executablePassIds.indexOf(targetReview.passId);
      if (start >= 0) {
        for (const id of ownerRun.executablePassIds.slice(start)) {
          const pass = ownerRun.passes.find((p) => p.passId === id);
          if (!pass) continue;
          if (id !== targetReview.passId) {
            pass.status = 'pending';
            pass.startedAt = null;
            pass.completedAt = null;
            pass.error = null;
            pass.validationErrors = [];
            pass.artifactType = null;
            pass.artifactVersion = null;
          }
          delete ownerRun.artifacts[id];
        }
      }

      ownerRun.updatedAt = now;
      this.store.update(ownerRun);
      return { review: targetReview, pipeline: toPipelineRunSummary(ownerRun) };
    }

    reviewedPass.status = 'approved';
    ownerRun.status = 'approved';
    ownerRun.currentPassId = targetReview.passId;
    ownerRun.updatedAt = now;
    this.store.update(ownerRun);

    const nextPass = nextExecutablePassId(ownerRun, targetReview.passId);
    if (nextPass) {
      await this.executeRun(ownerRun.pipelineId, { startFromPassId: nextPass });
    } else {
      ownerRun.status = 'completed';
      ownerRun.currentPassId = null;
      ownerRun.updatedAt = new Date().toISOString();
      this.store.update(ownerRun);
    }

    return { review: targetReview, pipeline: toPipelineRunSummary(this.store.get(ownerRun.pipelineId)!) };
  }

  async retryPassFrom(pipelineId: string, passId: PipelinePassId): Promise<PipelineRunSummary | null> {
    const run = this.store.get(pipelineId);
    if (!run) return null;

    const startIndex = run.executablePassIds.indexOf(passId);
    if (startIndex === -1) return null;

    for (const id of run.executablePassIds.slice(startIndex)) {
      const pass = run.passes.find((p) => p.passId === id);
      if (!pass) continue;
      pass.status = 'pending';
      pass.startedAt = null;
      pass.completedAt = null;
      pass.error = null;
      pass.validationErrors = [];
      pass.artifactType = null;
      pass.artifactVersion = null;
      delete run.artifacts[id];
    }

    run.status = 'queued';
    run.currentPassId = null;
    run.updatedAt = new Date().toISOString();
    this.store.update(run);

    await this.executeRun(pipelineId, { startFromPassId: passId });
    return toPipelineRunSummary(this.store.get(pipelineId)!);
  }

  async executeRun(
    pipelineId: string,
    opts: { startFromPassId?: PipelinePassId } = {},
  ): Promise<void> {
    const run = this.store.get(pipelineId);
    if (!run) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    const startIndex = opts.startFromPassId
      ? run.executablePassIds.indexOf(opts.startFromPassId)
      : 0;

    if (startIndex === -1) {
      throw new Error(`Pass ${opts.startFromPassId} is not executable in this pipeline run`);
    }

    const pendingReview = run.reviews.find((r) => r.status === 'pending');
    if (pendingReview) {
      throw new Error(
        `Pipeline ${pipelineId} is waiting for review ${pendingReview.reviewId} on pass ${pendingReview.passId}`
      );
    }

    run.status = 'running';
    run.updatedAt = new Date().toISOString();
    this.store.update(run);

    for (const passId of run.executablePassIds.slice(startIndex)) {
      const current = run.passes.find((p) => p.passId === passId);
      if (!current) continue;

      run.currentPassId = passId;
      current.status = 'running';
      current.startedAt = new Date().toISOString();
      current.completedAt = null;
      current.error = null;
      current.validationErrors = [];
      current.attempt += 1;
      run.updatedAt = new Date().toISOString();
      this.store.update(run);

      let succeeded = false;
      let lastError: string | null = null;

      for (let attempt = 1; attempt <= MAX_PASS_RETRIES + 1; attempt += 1) {
        try {
          const deps = {
            analysis: run.artifacts['P1_REQUIREMENT_ANALYSIS']?.data as PipelineRequirementAnalysisArtifact | undefined,
            risks: run.artifacts['P2_RISK_ASSESSMENT']?.data as PipelineRiskAssessmentArtifact | undefined,
            scenarios: run.artifacts['P3_TEST_SCENARIOS']?.data as PipelineScenarioArtifact | undefined,
            e2e: run.artifacts['P4_E2E_REQUIREMENTS']?.data as PipelineE2ERequirementsArtifact | undefined,
            pyramid: run.artifacts['P5_TEST_PYRAMID']?.data as PipelinePyramidDistributionArtifact | undefined,
            tm20: run.artifacts['P6_TM20_TEST_CASES']?.data as PipelineTM20TestCasesArtifact | undefined,
            bulkImport: run.artifacts['P7_BULK_IMPORT']?.data as PipelineBulkImportArtifact | undefined,
            automation: run.artifacts['P8_AUTOMATION_STRATEGY']?.data as PipelineAutomationStrategyArtifact | undefined,
            rtm: run.artifacts['P9_RTM']?.data as PipelineRTMArtifact | undefined,
            coverage: run.artifacts['P10_COVERAGE']?.data as PipelineCoverageSummaryArtifact | undefined,
          };

          const result = executeCorePass(passId, run.request, deps);
          const validation = validateCorePassArtifact(passId, result.data);

          if (!validation.valid) {
            throw new Error(validation.errors.join('; '));
          }

          const now = new Date().toISOString();
          run.artifacts[passId] = {
            artifactType: result.artifactType,
            artifactVersion: result.artifactVersion,
            createdAt: now,
            data: result.data,
          };

          current.status = 'passed';
          current.validationErrors = [];
          current.error = null;
          current.completedAt = now;
          current.artifactType = result.artifactType;
          current.artifactVersion = result.artifactVersion;
          run.updatedAt = now;
          this.store.update(run);

          succeeded = true;
          break;
        } catch (err) {
          lastError = (err as Error).message;
          current.validationErrors = lastError ? [lastError] : ['Unknown pass execution error'];
        }

        if (attempt <= MAX_PASS_RETRIES) {
          current.attempt += 1;
          this.store.update(run);
        }
      }

      if (!succeeded) {
        current.status = 'failed';
        current.error = lastError ?? 'Unknown execution failure';
        current.completedAt = new Date().toISOString();
        run.status = 'failed';
        run.updatedAt = new Date().toISOString();
        this.store.update(run);
        return;
      }

      if (isReviewCheckpoint(run, passId)) {
        const now = new Date().toISOString();
        const review: PipelineReviewRecord = {
          reviewId: randomUUID(),
          pipelineId,
          passId,
          status: 'pending' as PipelineReviewStatus,
          createdAt: now,
          updatedAt: now,
          decidedAt: null,
          reviewer: null,
          comments: null,
        };

        run.reviews.push(review);
        run.status = 'waiting_review';
        run.currentPassId = passId;
        run.updatedAt = now;
        this.store.update(run);
        return;
      }
    }

    run.currentPassId = null;
    run.status = 'completed';
    run.updatedAt = new Date().toISOString();
    this.store.update(run);
  }
}

const pipelineStore = new InMemoryPipelineStore();
export const pipelineOrchestrator = new PipelineOrchestrator(pipelineStore);
