import type { PipelineRiskAssessmentArtifact, PipelineRiskItem } from '@shared/types';
import Pill from './Pill';

const LEVEL_TONE: Record<PipelineRiskItem['level'], 'critical' | 'high' | 'medium' | 'low'> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

export default function RiskAssessmentView({ data }: { data: PipelineRiskAssessmentArtifact }) {
  const risks = data.risks ?? [];

  if (risks.length === 0) {
    return <p className="text-xs text-gray-500">No risks were identified for this requirement.</p>;
  }

  return (
    <div className="space-y-2.5">
      {risks.map((risk) => (
        <div key={risk.id} className="bg-gray-800/40 border border-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-indigo-400">{risk.id}</span>
              <span className="text-[11px] px-2 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-400">
                {risk.category}
              </span>
            </div>
            <Pill tone={LEVEL_TONE[risk.level]}>{risk.level}</Pill>
          </div>
          <p className="text-sm text-gray-200">{risk.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Impact: </span>
              <span className="text-gray-300">{risk.impact}</span>
            </div>
            <div>
              <span className="text-gray-500">Likelihood: </span>
              <span className="text-gray-300">{risk.likelihood}</span>
            </div>
            <div>
              <span className="text-gray-500">Mitigation: </span>
              <span className="text-gray-300">{risk.mitigation}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
