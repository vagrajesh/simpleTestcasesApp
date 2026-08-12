import { useCallback, useState } from 'react';
import type { LLMConfig, PipelineCreateRequest, PipelinePassId } from '@shared/types';
import { usePipelineRun } from '../../hooks/usePipelineRun';
import StoryPicker from '../StoryPicker';
import CreatePipelineRun from './CreatePipelineRun';
import RunDashboard from './RunDashboard';
import ArtifactPanel from './ArtifactPanel';
import ErrorBanner from '../ErrorBanner';
import RequirementSummaryCard from './RequirementSummaryCard';

type StoryMode = 'manual' | 'servicenow';

interface Props {
  llmConfig: LLMConfig | null;
  serviceNowConfigured: boolean;
}

export default function PipelineView({ llmConfig, serviceNowConfigured }: Props) {
  const { pipeline, passes, pendingReview, loading, error, start, retryPass, submitReview, reset } =
    usePipelineRun();
  const [storyPrefill, setStoryPrefill] = useState<string>('');
  const [selectedPassId, setSelectedPassId] = useState<PipelinePassId | null>(null);
  const [submittedRequirement, setSubmittedRequirement] = useState<PipelineCreateRequest | null>(null);
  const [requirementExpanded, setRequirementExpanded] = useState<boolean>(false);

  const handleStoryModeChange = useCallback((_mode: StoryMode) => {}, []);
  const handleSelectStory = useCallback((_story: { sysId: string; number: string }, composedText: string) => {
    setStoryPrefill(composedText);
  }, []);

  const handleStart = (request: PipelineCreateRequest): void => {
    setSubmittedRequirement(request);
    setRequirementExpanded(false);
    start(request);
  };

  const handleNewRun = (): void => {
    setSelectedPassId(null);
    setSubmittedRequirement(null);
    reset();
  };

  const selectedPass = passes.find((p) => p.passId === selectedPassId);

  if (!pipeline) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <StoryPicker enabled={serviceNowConfigured} onSelectStory={handleSelectStory} onModeChange={handleStoryModeChange} />
          <CreatePipelineRun loading={loading} llmConfig={llmConfig} onStart={handleStart} prefillText={storyPrefill} />
          {error && <ErrorBanner error={error} />}
        </div>
        <div className="flex flex-col items-center justify-center gap-2 h-64 border border-dashed border-gray-800 rounded-xl text-gray-600 text-sm">
          <span className="text-2xl">🧭</span>
          <p>Run progress will appear here</p>
          <p className="text-xs text-gray-700">Fill in a requirement → start pipeline → review each pass</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNewRun}
          className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors text-gray-300 cursor-pointer"
        >
          New Run
        </button>
      </div>

      {error && <ErrorBanner error={error} />}

      {submittedRequirement && (
        <RequirementSummaryCard
          request={submittedRequirement}
          expanded={requirementExpanded}
          onToggle={() => setRequirementExpanded((v) => !v)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <RunDashboard
          pipeline={pipeline}
          passes={passes}
          pendingReview={pendingReview}
          loading={loading}
          selectedPassId={selectedPassId}
          onSelectPass={setSelectedPassId}
          onRetryPass={retryPass}
          onSubmitReview={submitReview}
        />

        {selectedPassId && selectedPass ? (
          <ArtifactPanel
            key={`${pipeline.pipelineId}-${selectedPassId}`}
            pipelineId={pipeline.pipelineId}
            passId={selectedPassId}
            passName={selectedPass.name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 h-64 border border-dashed border-gray-800 rounded-xl text-gray-600 text-sm">
            <span className="text-2xl">📄</span>
            <p>Select a completed pass to view its output</p>
          </div>
        )}
      </div>
    </div>
  );
}
