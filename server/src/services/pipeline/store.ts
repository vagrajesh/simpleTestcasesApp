import type {
  PipelineArtifactPayload,
  PipelineCreateRequest,
  PipelineMode,
  PipelinePassDetail,
  PipelinePassId,
  PipelinePassStatus,
  PipelineReviewRecord,
  PipelineRunStatus,
  PipelineRunSummary,
} from '@shared/types';

interface PipelinePassRecord {
  passId: PipelinePassId;
  name: string;
  order: number;
  status: PipelinePassStatus;
  startedAt: string | null;
  completedAt: string | null;
  attempt: number;
  error: string | null;
  validationErrors: string[];
  artifactType: string | null;
  artifactVersion: string | null;
}

interface PipelineRunRecord {
  pipelineId: string;
  title: string;
  status: PipelineRunStatus;
  mode: PipelineMode;
  reviewEnabled: boolean;
  currentPassId: PipelinePassId | null;
  createdAt: string;
  updatedAt: string;
  request: PipelineCreateRequest;
  executablePassIds: PipelinePassId[];
  passes: PipelinePassRecord[];
  reviews: PipelineReviewRecord[];
  artifacts: Partial<Record<PipelinePassId, {
    artifactType: string;
    artifactVersion: string;
    createdAt: string;
    data: PipelineArtifactPayload;
  }>>;
}

export interface PipelineStore {
  insert(run: PipelineRunRecord): void;
  get(pipelineId: string): PipelineRunRecord | null;
  list(): PipelineRunRecord[];
  update(run: PipelineRunRecord): void;
}

export class InMemoryPipelineStore implements PipelineStore {
  private readonly runs = new Map<string, PipelineRunRecord>();

  insert(run: PipelineRunRecord): void {
    this.runs.set(run.pipelineId, run);
  }

  get(pipelineId: string): PipelineRunRecord | null {
    return this.runs.get(pipelineId) ?? null;
  }

  list(): PipelineRunRecord[] {
    return Array.from(this.runs.values());
  }

  update(run: PipelineRunRecord): void {
    this.runs.set(run.pipelineId, run);
  }
}

function computeProgressPercent(passes: PipelinePassRecord[], executablePassIds: PipelinePassId[]): number {
  if (executablePassIds.length === 0) return 0;
  const runnable = passes.filter((p) => executablePassIds.includes(p.passId));
  const done = runnable.filter((p) => p.status === 'passed' || p.status === 'approved').length;
  return Math.round((done / executablePassIds.length) * 100);
}

export function toPipelineRunSummary(run: PipelineRunRecord): PipelineRunSummary {
  return {
    pipelineId: run.pipelineId,
    title: run.title,
    status: run.status,
    mode: run.mode,
    reviewEnabled: run.reviewEnabled,
    progressPercent: computeProgressPercent(run.passes, run.executablePassIds),
    currentPassId: run.currentPassId,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

export function toPipelinePassDetail(pass: PipelinePassRecord): PipelinePassDetail {
  return {
    passId: pass.passId,
    name: pass.name,
    order: pass.order,
    status: pass.status,
    startedAt: pass.startedAt,
    completedAt: pass.completedAt,
    attempt: pass.attempt,
    error: pass.error,
    validationErrors: pass.validationErrors,
    artifactType: pass.artifactType,
    artifactVersion: pass.artifactVersion,
  };
}

export type { PipelinePassRecord, PipelineRunRecord };
