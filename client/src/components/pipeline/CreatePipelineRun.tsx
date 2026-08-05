import { useEffect, useState } from 'react';
import type { LLMConfig, PipelineCreateRequest, TestCaseCategory } from '@shared/types';

interface CategoryMeta {
  id: TestCaseCategory;
  label: string;
}

const ALL_CATEGORIES: CategoryMeta[] = [
  { id: 'positive', label: 'Positive' },
  { id: 'negative', label: 'Negative' },
  { id: 'edge', label: 'Edge' },
  { id: 'e2e', label: 'E2E' },
];

interface Props {
  loading: boolean;
  llmConfig: LLMConfig | null;
  onStart: (request: PipelineCreateRequest) => void;
  prefillText?: string;
}

/**
 * Kicks off a step-by-step pipeline run. Uses the default review checkpoints
 * (P1, P6, P11) rather than exposing a checkpoint picker — passes between
 * checkpoints still surface individually in the Run Dashboard once complete.
 */
export default function CreatePipelineRun({ loading, llmConfig, onStart, prefillText }: Props) {
  const [userStory, setUserStory] = useState<string>('');
  const [requirementId, setRequirementId] = useState<string>('');
  const [userStoryId, setUserStoryId] = useState<string>('');
  const [epic, setEpic] = useState<string>('');
  const [feature, setFeature] = useState<string>('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string>('');
  const [categories, setCategories] = useState<TestCaseCategory[]>(['positive', 'negative', 'edge', 'e2e']);

  useEffect(() => {
    if (prefillText) setUserStory(prefillText);
  }, [prefillText]);

  const toggleCategory = (id: TestCaseCategory): void => {
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const trimmed = userStory.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 20;
  const isReady = trimmed.length >= 20 && categories.length > 0 && !loading && llmConfig !== null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!isReady || !llmConfig) return;

    const request: PipelineCreateRequest = {
      requirement: {
        userStory: trimmed,
        ...(requirementId.trim() && { requirementId: requirementId.trim() }),
        ...(userStoryId.trim() && { userStoryId: userStoryId.trim() }),
        ...(epic.trim() && { epic: epic.trim() }),
        ...(feature.trim() && { feature: feature.trim() }),
        ...(acceptanceCriteria.trim() && {
          acceptanceCriteria: acceptanceCriteria
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      },
      llm: llmConfig,
      execution: { mode: 'step-by-step', autoStart: false },
      options: { categories },
      review: { enabled: true },
    };

    onStart(request);
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Requirement</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={userStory}
          onChange={(e) => setUserStory(e.target.value)}
          rows={6}
          placeholder={`As a [user], I want to [action] so that [benefit].\n\nExample: As a claims adjuster, I want to submit a TM2.0 test case for review so that QA can validate coverage before release.`}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />

        {tooShort && (
          <p className="text-xs text-amber-400">Story must be at least 20 characters ({trimmed.length}/20)</p>
        )}

        {/* Optional requirement metadata */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Requirement ID</label>
            <input
              type="text"
              value={requirementId}
              onChange={(e) => setRequirementId(e.target.value)}
              placeholder="REQ-1042"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">User Story ID</label>
            <input
              type="text"
              value={userStoryId}
              onChange={(e) => setUserStoryId(e.target.value)}
              placeholder="STORY-2201"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Epic</label>
            <input
              type="text"
              value={epic}
              onChange={(e) => setEpic(e.target.value)}
              placeholder="Claims Intake"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Feature</label>
            <input
              type="text"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="Test Case Review"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs text-gray-400">Acceptance Criteria <span className="text-gray-600">(one per line)</span></label>
          <textarea
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            rows={3}
            placeholder={'Given a submitted claim\nWhen the adjuster approves it\nThen the status updates to "Approved"'}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Category checkboxes */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Scenario categories (feeds Pass 3)</p>
          <div className="grid grid-cols-4 gap-2">
            {ALL_CATEGORIES.map(({ id, label }) => (
              <label
                key={id}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-colors select-none text-xs font-medium ${
                  categories.includes(id)
                    ? 'border-indigo-500 bg-indigo-950/40 text-gray-200'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(id)}
                  onChange={() => toggleCategory(id)}
                  className="accent-indigo-500"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-xs text-gray-400">
          Review gates pause the run after <span className="text-gray-300 font-medium">Pass 1</span>,{' '}
          <span className="text-gray-300 font-medium">Pass 6</span>, and{' '}
          <span className="text-gray-300 font-medium">Pass 11</span>. Approve each to continue.
        </div>

        <button
          type="submit"
          disabled={!isReady}
          className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            isReady
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? 'Starting pipeline…' : 'Start Pipeline'}
        </button>
      </form>
    </div>
  );
}
