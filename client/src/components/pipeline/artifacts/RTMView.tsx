import type { PipelineRTMArtifact, PipelineRTMEntry } from '@shared/types';
import Pill from './Pill';

const COVERAGE_TONE: Record<PipelineRTMEntry['coverage_status'], 'good' | 'medium' | 'bad'> = {
  Full: 'good',
  Partial: 'medium',
  Missing: 'bad',
};

export default function RTMView({ data }: { data: PipelineRTMArtifact }) {
  const entries = data.entries ?? [];

  return (
    <div className="overflow-x-auto border border-gray-800 rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 bg-gray-800/60">
            <th className="py-2 px-3 font-medium">Requirement</th>
            <th className="py-2 px-3 font-medium">Business Rule</th>
            <th className="py-2 px-3 font-medium">Scenario</th>
            <th className="py-2 px-3 font-medium">Test Case</th>
            <th className="py-2 px-3 font-medium">Coverage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {entries.map((entry, i) => (
            <tr key={`${entry.requirement_id}-${i}`} className="text-gray-300">
              <td className="py-1.5 px-3">
                <span className="font-mono text-indigo-400">{entry.requirement_id}</span>
                <p className="text-gray-500 mt-0.5">{entry.requirement_description}</p>
              </td>
              <td className="py-1.5 px-3">{entry.business_rule}</td>
              <td className="py-1.5 px-3 font-mono">{entry.test_scenario_id}</td>
              <td className="py-1.5 px-3 font-mono">{entry.test_case_number}</td>
              <td className="py-1.5 px-3">
                <Pill tone={COVERAGE_TONE[entry.coverage_status]}>{entry.coverage_status}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
