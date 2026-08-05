import type { PipelineTM20TestCase, PipelineTM20TestCasesArtifact } from '@shared/types';
import Pill from './Pill';

const PRIORITY_TONE: Record<PipelineTM20TestCase['priority'], 'critical' | 'high' | 'medium' | 'low'> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

export default function TM20TestCasesView({ data }: { data: PipelineTM20TestCasesArtifact }) {
  const testCases = data.test_cases ?? [];

  return (
    <div className="space-y-3">
      {testCases.map((tc, i) => {
        const steps = tc.steps ?? [];
        return (
          <div key={`${tc.u_fhlbdm_test_case_id}-${i}`} className="bg-gray-800/40 border border-gray-800 rounded-lg p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-indigo-400">{tc.u_fhlbdm_test_case_id}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-400">
                  {tc.test_type}
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-400">
                  {tc.u_automated === 'Yes' ? 'Automatable' : 'Manual'}
                </span>
              </div>
              <Pill tone={PRIORITY_TONE[tc.priority]}>{tc.priority}</Pill>
            </div>

            <p className="text-sm font-medium text-gray-200">{tc.short_description}</p>
            <p className="text-xs text-gray-400">{tc.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-gray-500">
              <span>Story: <span className="text-gray-300">{tc.user_story_id}</span></span>
              <span>Technique: <span className="text-gray-300">{tc.u_testing_technique}</span></span>
              <span>Module: <span className="text-gray-300">{tc.u_module_services}</span></span>
              <span>Dept: <span className="text-gray-300">{tc.u_product_name_dept}</span></span>
              <span>Business Unit: <span className="text-gray-300">{tc.u_business_unit}</span></span>
              <span>Risk approach: <span className="text-gray-300">{tc.u_risk_approach}</span></span>
            </div>

            {steps.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-800">
                      <th className="py-1.5 pr-2 font-medium w-8">#</th>
                      <th className="py-1.5 pr-2 font-medium">Step</th>
                      <th className="py-1.5 pr-2 font-medium">Test Data</th>
                      <th className="py-1.5 font-medium">Expected Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {steps.map((step) => (
                      <tr key={step.order}>
                        <td className="py-1.5 pr-2 text-gray-500 align-top">{step.order}</td>
                        <td className="py-1.5 pr-2 text-gray-300 align-top">
                          {step.step}
                          {step.needs_verification && (
                            <span className="ml-1.5 text-[10px] text-amber-400">(needs verification)</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-gray-400 align-top">{step.test_data}</td>
                        <td className="py-1.5 text-gray-300 align-top">{step.expected_result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
