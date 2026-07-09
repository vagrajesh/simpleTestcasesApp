import TestCaseCard from './TestCaseCard';
import { exportAsJSON, exportAsCSV } from '../utils/exportUtils';

const CATEGORY_ORDER = ['positive', 'negative', 'edge', 'e2e'];
const CATEGORY_LABEL = { positive: 'Positive', negative: 'Negative', edge: 'Edge', e2e: 'E2E' };

export default function ResultsPanel({ testCases, meta }) {
  // Group by category in a fixed display order
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const cases = testCases.filter((tc) => tc.category === cat);
    if (cases.length > 0) acc[cat] = cases;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Meta + export bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <span className="font-medium text-gray-200">{testCases.length} test cases</span>
          <span className="text-gray-600">·</span>
          <span>{meta.provider} / {meta.model}</span>
          <span className="text-gray-600">·</span>
          <span>{meta.latency.toLocaleString()} ms</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportAsJSON(testCases)}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors text-gray-300 cursor-pointer"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => exportAsCSV(testCases)}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors text-gray-300 cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Category sections */}
      {Object.entries(grouped).map(([cat, cases]) => (
        <section key={cat}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-300">{CATEGORY_LABEL[cat]}</h3>
            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              {cases.length}
            </span>
          </div>
          <div className="space-y-3">
            {cases.map((tc) => (
              <TestCaseCard key={tc.id} testCase={tc} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
