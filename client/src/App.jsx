import { useState, useCallback } from 'react';
import LLMSelector from './components/LLMSelector';
import StoryInput from './components/StoryInput';
import ResultsPanel from './components/ResultsPanel';
import ErrorBanner from './components/ErrorBanner';
import { useTestCaseGenerator } from './hooks/useTestCaseGenerator';

export default function App() {
  const [llmConfig, setLlmConfig] = useState(null);
  const { loading, error, results, generate, retry } = useTestCaseGenerator();

  const handleGenerate = useCallback(
    ({ userStory, categories }) => {
      if (!llmConfig) return;
      generate({ userStory, categories, llmConfig });
    },
    [llmConfig, generate]
  );

  const providerLabel = llmConfig?.provider === 'local' ? 'Local LLM' : 'Groq';
  const modelLabel    = llmConfig?.model || '…';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Header ───────────────────────────────────────── */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white text-sm font-bold select-none">
          TC
        </div>
        <div>
          <h1 className="text-base font-semibold leading-none">Test Case Generator</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Paste a user story → get structured test cases via LLM
          </p>
        </div>
      </header>

      {/* ── Two-panel layout ─────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Left: config + input */}
        <div className="space-y-4">
          <LLMSelector onChange={setLlmConfig} />
          <StoryInput
            loading={loading}
            llmConfig={llmConfig}
            onGenerate={handleGenerate}
          />
        </div>

        {/* Right: results */}
        <div>
          {error && <ErrorBanner error={error} onRetry={retry} />}

          {results && !error && (
            <ResultsPanel
              testCases={results.testCases}
              meta={{
                provider: results.provider_used,
                model:    results.model_used,
                latency:  results.latency_ms,
              }}
            />
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 h-64 border border-dashed border-gray-700 rounded-xl text-gray-400 text-sm">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p>
                Generating with{' '}
                <span className="text-gray-200 font-medium">{providerLabel}</span>{' '}
                (<span className="text-gray-200">{modelLabel}</span>)…
              </p>
            </div>
          )}

          {!results && !error && !loading && (
            <div className="flex flex-col items-center justify-center gap-2 h-64 border border-dashed border-gray-800 rounded-xl text-gray-600 text-sm">
              <span className="text-2xl">📋</span>
              <p>Results will appear here</p>
              <p className="text-xs text-gray-700">Configure LLM → paste a story → generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
