import type { PipelinePassStatus } from '@shared/types';

const STATUS_STYLE: Record<PipelinePassStatus, string> = {
  pending: 'bg-gray-800 text-gray-500 border-gray-700',
  running: 'bg-blue-900/40 text-blue-300 border-blue-700 animate-pulse',
  passed: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
  approved: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  needs_revision: 'bg-amber-900/40 text-amber-300 border-amber-700',
  failed: 'bg-red-900/40 text-red-300 border-red-700',
};

const STATUS_LABEL: Record<PipelinePassStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  passed: 'Passed',
  approved: 'Approved',
  needs_revision: 'Needs Revision',
  failed: 'Failed',
};

export default function PassStatusBadge({ status }: { status: PipelinePassStatus }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded border whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
