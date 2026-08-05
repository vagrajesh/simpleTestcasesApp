import type { PipelineRequirementAnalysisArtifact } from '@shared/types';

export default function RequirementAnalysisView({ data }: { data: PipelineRequirementAnalysisArtifact }) {
  const actors = data.actors ?? [];
  const functionalRequirements = data.functionalRequirements ?? [];
  const assumptions = data.assumptions ?? [];
  const missingInformation = data.missingInformation ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-800/60 rounded-lg p-3">
          <p className="text-gray-500 mb-0.5">Requirement ID</p>
          <p className="text-gray-200 font-mono">{data.requirementId}</p>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-3">
          <p className="text-gray-500 mb-0.5">User Story ID</p>
          <p className="text-gray-200 font-mono">{data.userStoryId}</p>
        </div>
        <div className="col-span-2 bg-gray-800/60 rounded-lg p-3">
          <p className="text-gray-500 mb-0.5">Business Process</p>
          <p className="text-gray-200">{data.businessProcess}</p>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Actors</h4>
        <div className="flex flex-wrap gap-1.5">
          {actors.map((actor) => (
            <span key={actor} className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-300">
              {actor}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Functional Requirements <span className="text-gray-600">({functionalRequirements.length})</span>
        </h4>
        <ul className="space-y-1.5">
          {functionalRequirements.map((req) => (
            <li key={req.id} className="text-sm text-gray-300 bg-gray-800/40 rounded-lg px-3 py-2">
              <span className="text-xs font-mono text-indigo-400 mr-2">{req.id}</span>
              {req.statement}
            </li>
          ))}
        </ul>
      </div>

      {assumptions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Assumptions</h4>
          <ul className="list-disc ml-4 space-y-1 text-sm text-gray-300">
            {assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {missingInformation.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">
            Clarification Gaps
          </h4>
          <ul className="list-disc ml-4 space-y-1 text-sm text-amber-200/80">
            {missingInformation.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
