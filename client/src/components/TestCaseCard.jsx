import { useState } from 'react';
import { copyToClipboard, formatTestCaseAsText } from '../utils/exportUtils';

const PRIORITY_BADGE = {
  High:   'bg-red-900/50 text-red-300 border-red-700',
  Medium: 'bg-amber-900/50 text-amber-300 border-amber-700',
  Low:    'bg-green-900/50 text-green-300 border-green-700',
};

const CATEGORY_BADGE = {
  positive: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
  negative: 'bg-red-900/30 text-red-400 border-red-800',
  edge:     'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  e2e:      'bg-blue-900/30 text-blue-400 border-blue-800',
};

export default function TestCaseCard({ testCase }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(formatTestCaseAsText(testCase));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const priorityClass  = PRIORITY_BADGE[testCase.priority]  ?? PRIORITY_BADGE.Medium;
  const categoryClass  = CATEGORY_BADGE[testCase.category]  ?? '';

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-indigo-400">{testCase.id}</span>
          <span className={`text-xs px-2 py-0.5 rounded border ${categoryClass}`}>
            {testCase.category}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded border ${priorityClass}`}>
            {testCase.priority}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-gray-100 leading-snug">{testCase.title}</h3>

      {/* Body */}
      <div className="space-y-2 text-xs">
        {testCase.preconditions && (
          <div>
            <span className="text-gray-500 font-medium">Preconditions: </span>
            <span className="text-gray-300">{testCase.preconditions}</span>
          </div>
        )}

        {testCase.steps?.length > 0 && (
          <div>
            <span className="text-gray-500 font-medium">Steps:</span>
            <ol className="mt-1 ml-4 list-decimal space-y-0.5 text-gray-300">
              {testCase.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {testCase.expectedResult && (
          <div>
            <span className="text-gray-500 font-medium">Expected: </span>
            <span className="text-gray-300">{testCase.expectedResult}</span>
          </div>
        )}
      </div>
    </div>
  );
}
