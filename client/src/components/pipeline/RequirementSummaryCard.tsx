import type { PipelineCreateRequest } from '@shared/types';

interface Props {
  request: PipelineCreateRequest;
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Shows what was submitted to start the run. Collapses to a single row once
 * the run starts (so it doesn't compete with the pass tracker/artifact panel
 * for space) but stays available to re-expand — the requirement and
 * acceptance criteria the user typed would otherwise disappear entirely.
 */
export default function RequirementSummaryCard({ request, expanded, onToggle }: Props) {
  const { requirement } = request;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-left hover:border-gray-600 transition-colors cursor-pointer"
      >
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest shrink-0">Requirement</span>
        <span className="text-sm text-gray-300 truncate flex-1">{requirement.userStory}</span>
        <span className="text-xs text-indigo-400 shrink-0">Maximize ▾</span>
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Requirement</h2>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer shrink-0"
        >
          Minimize ▴
        </button>
      </div>

      <p className="text-sm text-gray-200">{requirement.userStory}</p>

      {(requirement.requirementId || requirement.userStoryId || requirement.epic || requirement.feature) && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
          {requirement.requirementId && <span>Requirement ID: <span className="text-gray-300">{requirement.requirementId}</span></span>}
          {requirement.userStoryId && <span>User Story ID: <span className="text-gray-300">{requirement.userStoryId}</span></span>}
          {requirement.epic && <span>Epic: <span className="text-gray-300">{requirement.epic}</span></span>}
          {requirement.feature && <span>Feature: <span className="text-gray-300">{requirement.feature}</span></span>}
        </div>
      )}

      {requirement.acceptanceCriteria && requirement.acceptanceCriteria.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Acceptance Criteria</p>
          <ul className="list-decimal ml-4 space-y-0.5 text-sm text-gray-300">
            {requirement.acceptanceCriteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
