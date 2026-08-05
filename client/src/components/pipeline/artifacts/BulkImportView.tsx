import type { PipelineBulkImportArtifact } from '@shared/types';
import { exportBulkImportAsCSV } from '../../../utils/exportUtils';

export default function BulkImportView({ data }: { data: PipelineBulkImportArtifact }) {
  const rows = data.rows ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{rows.length} rows (one per test step)</p>
        <button
          type="button"
          onClick={() => exportBulkImportAsCSV(rows)}
          className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors text-gray-300 cursor-pointer"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-800 rounded-lg">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="text-left text-gray-500 bg-gray-800/60">
              <th className="py-2 px-3 font-medium">Test Case #</th>
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium">Pyramid Layer</th>
              <th className="py-2 px-3 font-medium">Step #</th>
              <th className="py-2 px-3 font-medium">Action</th>
              <th className="py-2 px-3 font-medium">Expected Result</th>
              <th className="py-2 px-3 font-medium">Automation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map((row, i) => (
              <tr key={`${row.test_case_number}-${row.step_number}-${i}`} className="text-gray-300">
                <td className="py-1.5 px-3 font-mono text-indigo-400">{row.test_case_number}</td>
                <td className="py-1.5 px-3 max-w-[220px] truncate">{row.test_case_name}</td>
                <td className="py-1.5 px-3">{row.priority}</td>
                <td className="py-1.5 px-3">{row.risk_level}</td>
                <td className="py-1.5 px-3">{row.test_pyramid_layer}</td>
                <td className="py-1.5 px-3 text-gray-500">{row.step_number}</td>
                <td className="py-1.5 px-3 max-w-[260px] truncate">{row.action}</td>
                <td className="py-1.5 px-3 max-w-[260px] truncate">{row.expected_result}</td>
                <td className="py-1.5 px-3">{row.automation_candidate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
