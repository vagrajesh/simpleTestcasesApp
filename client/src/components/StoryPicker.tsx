import { useState, useEffect, useCallback } from 'react';
import { fetchServiceNowStories } from '../api/servicenow';

type StoryMode = 'manual' | 'servicenow';

interface StoryRef {
  sysId: string;
  number: string;
}

interface ServiceNowStory {
  sysId: string;
  number: string;
  shortDescription: string;
  description: string;
  state: string;
  priority: string;
  acceptanceCriteria: string;
  epic: { sysId: string; number: string; title: string } | null;
  source: 'servicenow';
}

interface Props {
  enabled: boolean;
  onSelectStory: (story: StoryRef, composedText: string) => void;
  onModeChange?: (mode: StoryMode) => void;
}

/** Combines a ServiceNow story's fields into the free-text shape the generator expects. */
function composeStoryText(story: ServiceNowStory): string {
  return [
    story.shortDescription,
    story.description,
    story.acceptanceCriteria ? `Acceptance Criteria:\n${story.acceptanceCriteria}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Lets the user choose between writing a story manually and pulling one from
 * ServiceNow. Only renders once the backend reports ServiceNow as configured.
 *
 * Calls `onSelectStory({ sysId, number }, composedText)` when a story is picked,
 * and `onModeChange(mode)` whenever the mode toggles (so the parent can clear
 * the previously-selected story when switching back to manual).
 */
export default function StoryPicker({ enabled, onSelectStory, onModeChange }: Props) {
  const [mode, setMode] = useState<StoryMode>('manual');
  const [stories, setStories] = useState<ServiceNowStory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSysId, setSelectedSysId] = useState<string | null>(null);

  const loadStories = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchServiceNowStories();
      setStories(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to load ServiceNow stories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'servicenow' && stories.length === 0 && !loading && !error) {
      loadStories();
    }
  }, [mode, stories.length, loading, error, loadStories]);

  if (!enabled) return null;

  const switchMode = (m: StoryMode): void => {
    setMode(m);
    onModeChange?.(m);
  };

  const selectStory = (story: ServiceNowStory): void => {
    setSelectedSysId(story.sysId);
    onSelectStory({ sysId: story.sysId, number: story.number }, composeStoryText(story));
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Story Source</h2>
        <div className="flex rounded-lg bg-gray-800 p-1 gap-1">
          {([
            { id: 'manual' as StoryMode, label: 'Write my own' },
            { id: 'servicenow' as StoryMode, label: 'Pull from ServiceNow' },
          ]).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchMode(id)}
              className={`py-1 px-2.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                mode === id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'servicenow' && (
        <div className="space-y-2">
          {loading && <p className="text-xs text-gray-500">Loading stories from ServiceNow…</p>}

          {error && (
            <div className="flex items-center justify-between gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              <span>{error}</span>
              <button type="button" onClick={loadStories} className="underline shrink-0 cursor-pointer">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && stories.length === 0 && (
            <p className="text-xs text-gray-500">No open stories found.</p>
          )}

          {stories.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {stories.map((story) => (
                <button
                  key={story.sysId}
                  type="button"
                  onClick={() => selectStory(story)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    selectedSysId === story.sysId
                      ? 'border-indigo-500 bg-indigo-950/40'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-200">{story.number}</span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {story.state} · {story.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{story.shortDescription}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
