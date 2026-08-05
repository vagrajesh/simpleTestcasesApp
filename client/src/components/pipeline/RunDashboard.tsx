import type {
  PipelinePassId,
  PipelinePassSummary,
  PipelineReviewDecision,
  PipelineReviewRecord,
  PipelineRunStatus,
  PipelineRunSummary,
} from '@shared/types';
import PassStatusBadge from './PassStatusBadge';
import ReviewGatePanel from './ReviewGatePanel';

const RUN_STATUS_STYLE: Record<PipelineRunStatus, string> = {
  queued: 'bg-gray-800 text-gray-400 border-gray-700',
  running: 'bg-blue-900/40 text-blue-300 border-blue-700',
  waiting_review: 'bg-amber-900/40 text-amber-300 border-amber-700',
  rejected: 'bg-amber-900/40 text-amber-300 border-amber-700',
  approved: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
  completed: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  failed: 'bg-red-900/40 text-red-300 border-red-700',
  cancelled: 'bg-gray-800 text-gray-500 border-gray-700',
};

const RUN_STATUS_LABEL: Record<PipelineRunStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  waiting_review: 'Waiting on review',
  rejected: 'Rejected — needs revision',
  approved: 'Approved',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface Props {
  pipeline: PipelineRunSummary;
  passes: PipelinePassSummary[];
  pendingReview: PipelineReviewRecord | null;
  loading: boolean;
  selectedPassId: PipelinePassId | null;
  onSelectPass: (passId: PipelinePassId) => void;
  onRetryPass: (passId: PipelinePassId) => void;
  onSubmitReview: (decision: PipelineReviewDecision, reviewer: string, comments?: string) => void;
}

export default function RunDashboard({
  pipeline,
  passes,
  pendingReview,
  loading,
  selectedPassId,
  onSelectPass,
  onRetryPass,
  onSubmitReview,
}: Props) {
  const orderedPasses = [...passes].sort((a, b) => a.order - b.order);
  const needsRevisionPass = passes.find((p) => p.status === 'needs_revision');
  const failedPass = passes.find((p) => p.status === 'failed');

  return (
    <div className="space-y-4">
      {/* Run header */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">{pipeline.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{pipeline.pipelineId}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded border shrink-0 ${RUN_STATUS_STYLE[pipeline.status]}`}>
            {RUN_STATUS_LABEL[pipeline.status]}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{pipeline.progressPercent}% complete</span>
            <span>{pipeline.currentPassId ?? '—'}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${pipeline.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Review gate */}
      {pendingReview && <ReviewGatePanel review={pendingReview} loading={loading} onSubmit={onSubmitReview} />}

      {/* Rejected banner */}
      {!pendingReview && pipeline.status === 'rejected' && needsRevisionPass && (
        <div className="border border-amber-700 bg-amber-950/30 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-amber-300">{needsRevisionPass.name} needs revision</p>
            <p className="text-xs text-amber-200/70 mt-0.5">{needsRevisionPass.error}</p>
          </div>
          <button
            type="button"
            onClick={() => onRetryPass(needsRevisionPass.passId)}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-amber-900/60 hover:bg-amber-900 border border-amber-700 rounded-lg text-amber-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Retry &amp; Continue
          </button>
        </div>
      )}

      {/* Failed banner */}
      {pipeline.status === 'failed' && failedPass && (
        <div className="border border-red-800 bg-red-950/40 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-red-300">{failedPass.name} failed</p>
            <p className="text-xs text-red-400 mt-0.5 font-mono break-all">{failedPass.error}</p>
          </div>
          <button
            type="button"
            onClick={() => onRetryPass(failedPass.passId)}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-red-900/60 hover:bg-red-900 border border-red-700 rounded-lg text-red-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Pass list */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl divide-y divide-gray-800 overflow-hidden">
        {orderedPasses.map((pass) => {
          const isViewable = pass.status === 'passed' || pass.status === 'approved';
          const isRetryable = pass.status === 'failed' || pass.status === 'needs_revision';
          const isSelected = selectedPassId === pass.passId;

          return (
            <div
              key={pass.passId}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                isViewable ? 'cursor-pointer hover:bg-gray-800/60' : ''
              } ${isSelected ? 'bg-gray-800/80' : ''}`}
              onClick={() => isViewable && onSelectPass(pass.passId)}
            >
              <span className="text-xs font-mono text-gray-600 w-6 shrink-0">P{pass.order}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-200 truncate">{pass.name}</p>
                <p className="text-[11px] text-gray-600">
                  {pass.startedAt ? `started ${formatTime(pass.startedAt)}` : 'not started'}
                  {pass.completedAt ? ` · done ${formatTime(pass.completedAt)}` : ''}
                  {pass.attempt > 1 ? ` · attempt ${pass.attempt}` : ''}
                </p>
              </div>
              <PassStatusBadge status={pass.status} />
              {isRetryable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetryPass(pass.passId);
                  }}
                  disabled={loading}
                  className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  Retry
                </button>
              )}
              {isViewable && (
                <span className="text-xs text-indigo-400 shrink-0">{isSelected ? 'Viewing' : 'View →'}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
