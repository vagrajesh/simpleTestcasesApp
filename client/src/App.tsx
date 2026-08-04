import { useState, useCallback, useEffect } from 'react';
import type { LLMConfig, TestCaseCategory } from '@shared/types';
import LLMSelector from './components/LLMSelector';
import StoryPicker from './components/StoryPicker';
import StoryInput from './components/StoryInput';
import ResultsPanel from './components/ResultsPanel';
import ErrorBanner from './components/ErrorBanner';
import { useTestCaseGenerator } from './hooks/useTestCaseGenerator';
import { fetchServiceNowConfig } from './api/servicenow';

type StoryMode = 'manual' | 'servicenow';
type ActiveView = 'testcases' | 'settings';

interface StoryRef {
  sysId: string;
  number: string;
}

export default function App() {
  const [activeView, setActiveView]               = useState<ActiveView>('testcases');
  const [llmConfig, setLlmConfig]                 = useState<LLMConfig | null>(null);
  const [serviceNowConfigured, setServiceNowConfigured] = useState<boolean>(false);
  const [selectedStory, setSelectedStory]         = useState<StoryRef | null>(null);
  const [storyPrefill, setStoryPrefill]           = useState<string>('');
  const { loading, error, results, generate, retry } = useTestCaseGenerator();

  // Check once on mount whether the backend has ServiceNow configured,
  // so the picker only renders when it's actually usable.
  useEffect(() => {
    fetchServiceNowConfig()
      .then((data) => setServiceNowConfigured(Boolean(data?.integrations?.serviceNowConfigured)))
      .catch(() => setServiceNowConfigured(false));
  }, []);

  const handleSelectStory = useCallback((story: StoryRef, composedText: string) => {
    setSelectedStory(story);
    setStoryPrefill(composedText);
  }, []);

  const handleStoryModeChange = useCallback((mode: StoryMode) => {
    // Switching back to manual entry means the text may now diverge from
    // the originally-pulled story — don't keep offering to export to it.
    if (mode === 'manual') setSelectedStory(null);
  }, []);

  const handleGenerate = useCallback(
    ({ userStory, categories }: { userStory: string; categories: TestCaseCategory[] }) => {
      if (!llmConfig) return;
      generate({ userStory, categories, llmConfig });
    },
    [llmConfig, generate]
  );

  const providerLabel =
    llmConfig?.provider === 'local'  ? 'Local LLM' :
    llmConfig?.provider === 'openai' ? 'OpenAI'    : 'Groq';
  const modelLabel = llmConfig?.model || '…';

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    {
      id: 'testcases',
      label: 'Test Cases',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">

      {/* ── Left Sidebar ──────────────────────────────────── */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 min-h-screen">

        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 select-none">
            TC
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Test Case</p>
            <p className="text-xs text-gray-500 mt-0.5">Generator</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${
                activeView === id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>

      </aside>

      {/* ── Right Panel ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-auto">

        {/* Panel header */}
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold leading-none">
              {activeView === 'settings' ? 'Settings' : 'Test Cases'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeView === 'settings'
                ? 'Configure your LLM provider and connection settings'
                : 'Paste a user story and generate structured test cases'}
            </p>
          </div>

          {/* Connected LLM indicator */}
          {llmConfig ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-medium text-gray-200">{providerLabel}</span>
              {modelLabel !== '…' && (
                <span className="text-xs text-gray-500 max-w-[140px] truncate">{modelLabel}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg shrink-0">
              <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0" />
              <span className="text-xs text-gray-500">No LLM connected</span>
            </div>
          )}
        </header>

        {/* Panel content */}
        <div className="flex-1 p-6">

          {/* ── Settings view ── always mounted so LLMSelector state is never lost */}
          <div className={`max-w-lg${activeView !== 'settings' ? ' hidden' : ''}`}>
            <LLMSelector onChange={setLlmConfig} />
          </div>

          {/* ── Test Cases view ── */}
          {activeView === 'testcases' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

              {/* Left: story input */}
              <div className="space-y-4">
                <StoryPicker
                  enabled={serviceNowConfigured}
                  onSelectStory={handleSelectStory}
                  onModeChange={handleStoryModeChange}
                />
                <StoryInput
                  loading={loading}
                  llmConfig={llmConfig}
                  onGenerate={handleGenerate}
                  prefillText={storyPrefill}
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
          )}

        </div>
      </div>
    </div>
  );
}
