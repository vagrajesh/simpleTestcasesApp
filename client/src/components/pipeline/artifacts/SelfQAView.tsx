import type { PipelineSelfQAValidationArtifact } from '@shared/types';
import Pill from './Pill';

export default function SelfQAView({ data }: { data: PipelineSelfQAValidationArtifact }) {
  const checklist = data.checklist ?? [];
  const passCount = checklist.filter((c) => c.status === 'PASS').length;

  return (
    <div className="space-y-3">
      <div
        className={`rounded-lg p-3 flex items-center justify-between gap-3 border ${
          data.overallStatus === 'PASS'
            ? 'bg-emerald-950/30 border-emerald-800'
            : 'bg-red-950/30 border-red-800'
        }`}
      >
        <p className={`text-sm font-medium ${data.overallStatus === 'PASS' ? 'text-emerald-300' : 'text-red-300'}`}>
          Self-QA: {data.overallStatus}
        </p>
        <p className="text-xs text-gray-400">
          {passCount} / {checklist.length} checks passed
        </p>
      </div>

      <div className="divide-y divide-gray-800 border border-gray-800 rounded-lg overflow-hidden">
        {checklist.map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-3 py-2.5">
            <Pill tone={item.status === 'PASS' ? 'good' : 'bad'}>{item.status}</Pill>
            <div className="min-w-0">
              <p className="text-sm text-gray-200">{item.check}</p>
              {item.details && <p className="text-xs text-gray-500 mt-0.5">{item.details}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
