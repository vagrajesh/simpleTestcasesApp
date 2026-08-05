import type { PipelineE2ERequirementsArtifact } from '@shared/types';

export default function E2EWorkflowsView({ data }: { data: PipelineE2ERequirementsArtifact }) {
  const workflows = data.workflows ?? [];

  return (
    <div className="space-y-3">
      {workflows.map((wf) => (
        <div key={wf.workflowId} className="bg-gray-800/40 border border-gray-800 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-indigo-400">{wf.workflowId}</span>
            <p className="text-sm font-medium text-gray-200">{wf.workflowName}</p>
          </div>
          <p className="text-xs text-gray-400">{wf.businessObjective}</p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Initiating actor: </span>
              <span className="text-gray-300">{wf.initiatingActor}</span>
            </div>
            <div>
              <span className="text-gray-500">Systems: </span>
              <span className="text-gray-300">{(wf.systemsInvolved ?? []).join(', ')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Validation points</p>
              <ul className="list-disc ml-4 space-y-0.5 text-xs text-gray-300">
                {(wf.criticalValidationPoints ?? []).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] text-red-400/80 uppercase tracking-wide mb-1">Failure points</p>
              <ul className="list-disc ml-4 space-y-0.5 text-xs text-red-300/80">
                {(wf.failurePoints ?? []).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] text-emerald-400/80 uppercase tracking-wide mb-1">Recovery points</p>
              <ul className="list-disc ml-4 space-y-0.5 text-xs text-emerald-300/80">
                {(wf.recoveryPoints ?? []).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
