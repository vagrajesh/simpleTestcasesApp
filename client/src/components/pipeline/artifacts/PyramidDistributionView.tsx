import type { PipelinePyramidDistributionArtifact } from '@shared/types';

const LAYERS: { key: keyof PipelinePyramidDistributionArtifact['recommended']; label: string }[] = [
  { key: 'unit', label: 'Unit' },
  { key: 'componentApi', label: 'Component / API' },
  { key: 'uiE2E', label: 'UI / E2E' },
];

function Bar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex-1">
      <div className={`h-full ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PyramidDistributionView({ data }: { data: PipelinePyramidDistributionArtifact }) {
  const planned = data.planned ?? { unit: 0, componentApi: 0, uiE2E: 0 };
  const recommended = data.recommended ?? { unit: 0, componentApi: 0, uiE2E: 0 };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {LAYERS.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium">{label}</span>
              <span className="text-gray-500 font-variant-numeric-tabular">
                planned {planned[key]}% · recommended {recommended[key]}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600 w-16 shrink-0">Planned</span>
              <Bar pct={planned[key]} colorClass="bg-indigo-500" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600 w-16 shrink-0">Target</span>
              <Bar pct={recommended[key]} colorClass="bg-gray-600" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800/60 rounded-lg p-3 text-xs text-gray-300">{data.recommendation}</div>
    </div>
  );
}
