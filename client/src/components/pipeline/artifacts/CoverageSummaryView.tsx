import type { PipelineCoverageSummaryArtifact } from '@shared/types';

const STAT_FIELDS: { key: keyof PipelineCoverageSummaryArtifact; label: string }[] = [
  { key: 'total_requirements', label: 'Requirements' },
  { key: 'total_business_rules', label: 'Business Rules' },
  { key: 'total_test_scenarios', label: 'Scenarios' },
  { key: 'total_test_cases', label: 'Test Cases' },
  { key: 'total_e2e_test_cases', label: 'E2E Cases' },
  { key: 'total_api_test_cases', label: 'API Cases' },
  { key: 'total_integration_test_cases', label: 'Integration Cases' },
  { key: 'total_security_test_cases', label: 'Security Cases' },
  { key: 'automation_candidate_count', label: 'Automation Candidates' },
];

function GapList({ title, items, tone }: { title: string; items: string[] | undefined; tone: string }) {
  const list = items ?? [];
  if (list.length === 0) return null;
  return (
    <div>
      <h4 className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${tone}`}>{title}</h4>
      <ul className="list-disc ml-4 space-y-0.5 text-sm text-gray-300">
        {list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function CoverageSummaryView({ data }: { data: PipelineCoverageSummaryArtifact }) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800/60 rounded-lg p-4 flex items-center gap-4">
        <div className="text-3xl font-bold text-indigo-400 tabular-nums">{data.coverage_percentage}%</div>
        <div>
          <p className="text-sm text-gray-200 font-medium">Overall coverage</p>
          <p className="text-xs text-gray-500">Requirements traced to at least one test case</p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {STAT_FIELDS.map(({ key, label }) => (
          <div key={key} className="bg-gray-800/40 border border-gray-800 rounded-lg p-2.5">
            <div className="text-lg font-semibold text-gray-100 tabular-nums">{(data[key] as number) ?? 0}</div>
            <div className="text-[11px] text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <GapList title="Coverage Gaps" items={data.coverage_gaps} tone="text-amber-400" />
        <GapList title="High-Risk Areas" items={data.high_risk_areas} tone="text-red-400" />
        <GapList title="Missing Requirements" items={data.missing_requirements} tone="text-red-400" />
        <GapList title="Uncovered Business Rules" items={data.uncovered_business_rules} tone="text-amber-400" />
      </div>
    </div>
  );
}
