import type { PipelineAutomationStrategyArtifact } from '@shared/types';
import Pill from './Pill';

export default function AutomationStrategyView({ data }: { data: PipelineAutomationStrategyArtifact }) {
  const recommendations = data.recommendations ?? [];

  return (
    <div className="overflow-x-auto border border-gray-800 rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 bg-gray-800/60">
            <th className="py-2 px-3 font-medium">Test Case</th>
            <th className="py-2 px-3 font-medium">Candidate</th>
            <th className="py-2 px-3 font-medium">Feasibility</th>
            <th className="py-2 px-3 font-medium">Complexity</th>
            <th className="py-2 px-3 font-medium">Recommended Tool</th>
            <th className="py-2 px-3 font-medium">ROI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {recommendations.map((rec, i) => (
            <tr key={`${rec.test_case_id}-${i}`} className="text-gray-300">
              <td className="py-1.5 px-3 font-mono text-indigo-400">{rec.test_case_id}</td>
              <td className="py-1.5 px-3">
                <Pill tone={rec.automation_candidate === 'Yes' ? 'good' : 'neutral'}>{rec.automation_candidate}</Pill>
              </td>
              <td className="py-1.5 px-3">{rec.automation_feasibility}</td>
              <td className="py-1.5 px-3">{rec.automation_complexity}</td>
              <td className="py-1.5 px-3">{rec.recommended_tool}</td>
              <td className="py-1.5 px-3 max-w-[280px]">{rec.automation_roi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
