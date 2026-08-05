import type { PipelineScenarioArtifact, PipelineScenarioItem } from '@shared/types';

const TYPE_ORDER: PipelineScenarioItem['scenarioType'][] = ['Positive', 'Negative', 'Edge Cases', 'End to End'];
const TYPE_BADGE: Record<PipelineScenarioItem['scenarioType'], string> = {
  Positive: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
  Negative: 'bg-red-900/30 text-red-400 border-red-800',
  'Edge Cases': 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  'End to End': 'bg-blue-900/30 text-blue-400 border-blue-800',
};

export default function ScenariosView({ data }: { data: PipelineScenarioArtifact }) {
  const scenarios = data.scenarios ?? [];
  const grouped = TYPE_ORDER.reduce<Record<string, PipelineScenarioItem[]>>((acc, type) => {
    const items = scenarios.filter((s) => s.scenarioType === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{type}</h4>
            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{items.length}</span>
          </div>
          <div className="space-y-1.5">
            {items.map((s) => (
              <div key={s.id} className="bg-gray-800/40 border border-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono text-indigo-400">{s.id}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded border ${TYPE_BADGE[s.scenarioType]}`}>
                    {s.businessRuleRef}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-200">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.objective}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
