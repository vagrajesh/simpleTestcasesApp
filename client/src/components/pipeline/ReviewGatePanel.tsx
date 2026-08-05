import { useState } from 'react';
import type { PipelineReviewDecision, PipelineReviewRecord } from '@shared/types';

interface Props {
  review: PipelineReviewRecord;
  loading: boolean;
  onSubmit: (decision: PipelineReviewDecision, reviewer: string, comments?: string) => void;
}

/** Inline approve/reject gate shown when a run is paused at a review checkpoint. */
export default function ReviewGatePanel({ review, loading, onSubmit }: Props) {
  const [reviewer, setReviewer] = useState<string>('');
  const [comments, setComments] = useState<string>('');

  const canSubmit = reviewer.trim().length > 0 && !loading;

  const handleDecision = (decision: PipelineReviewDecision): void => {
    if (!canSubmit) return;
    onSubmit(decision, reviewer.trim(), comments.trim() || undefined);
  };

  return (
    <div className="border border-amber-700 bg-amber-950/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        <h3 className="text-sm font-semibold text-amber-300">Review required — {review.passId}</h3>
      </div>
      <p className="text-xs text-amber-200/80">
        This pass is a checkpoint. Approve to continue the run, or reject to send it back for revision.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs text-gray-400">Reviewer</label>
          <input
            type="text"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="Your name"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-gray-400">Comments <span className="text-gray-600">(optional)</span></label>
          <input
            type="text"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Required scope missing…"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleDecision('approve')}
          disabled={!canSubmit}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            canSubmit
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => handleDecision('reject')}
          disabled={!canSubmit}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            canSubmit
              ? 'bg-red-900/60 hover:bg-red-900 border border-red-700 text-red-200 cursor-pointer'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
