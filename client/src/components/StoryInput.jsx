import { useState } from 'react';

const ALL_CATEGORIES = [
  { id: 'positive', label: 'Positive', desc: 'Valid / happy-path flows' },
  { id: 'negative', label: 'Negative', desc: 'Invalid inputs, error handling' },
  { id: 'edge',     label: 'Edge',     desc: 'Boundary & unusual-but-valid' },
  { id: 'e2e',      label: 'E2E',      desc: 'Full end-to-end journeys' },
];

/**
 * User story textarea + category checkboxes + submit button.
 */
export default function StoryInput({ loading, llmConfig, onGenerate }) {
  const [userStory, setUserStory] = useState('');
  const [categories, setCategories] = useState(['positive', 'negative', 'edge', 'e2e']);

  const toggleCategory = (id) => {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const trimmed = userStory.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 20;
  const isReady = trimmed.length >= 20 && categories.length > 0 && !loading && llmConfig;

  const providerLabel = llmConfig?.provider === 'local' ? 'Local LLM' : 'Groq';
  const modelLabel    = llmConfig?.model || '...';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isReady) return;
    onGenerate({ userStory: trimmed, categories });
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">User Story</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={userStory}
          onChange={(e) => setUserStory(e.target.value)}
          rows={6}
          placeholder={`As a [user], I want to [action] so that [benefit].\n\nExample: As a customer, I want to reset my password so that I can regain access to my account.`}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />

        {tooShort && (
          <p className="text-xs text-amber-400">
            Story must be at least 20 characters ({trimmed.length}/20)
          </p>
        )}

        {/* Category checkboxes */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Categories to generate</p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_CATEGORIES.map(({ id, label, desc }) => (
              <label
                key={id}
                className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors select-none ${
                  categories.includes(id)
                    ? 'border-indigo-500 bg-indigo-950/40'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(id)}
                  onChange={() => toggleCategory(id)}
                  className="mt-0.5 accent-indigo-500"
                />
                <div>
                  <p className="text-xs font-medium text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>
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
          {loading
            ? `Generating with ${providerLabel} (${modelLabel})…`
            : 'Generate Test Cases'}
        </button>
      </form>
    </div>
  );
}
