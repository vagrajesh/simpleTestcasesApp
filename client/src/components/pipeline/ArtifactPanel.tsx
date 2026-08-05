import { useEffect, useState } from 'react';
import type {
  PipelineArtifactRecord,
  PipelineAutomationStrategyArtifact,
  PipelineBulkImportArtifact,
  PipelineCoverageSummaryArtifact,
  PipelineE2ERequirementsArtifact,
  PipelinePassId,
  PipelinePyramidDistributionArtifact,
  PipelineRequirementAnalysisArtifact,
  PipelineRiskAssessmentArtifact,
  PipelineRTMArtifact,
  PipelineScenarioArtifact,
  PipelineSelfQAValidationArtifact,
  PipelineTM20TestCasesArtifact,
} from '@shared/types';
import * as pipelineApi from '../../api/pipeline';
import ArtifactErrorBoundary from './ArtifactErrorBoundary';
import RequirementAnalysisView from './artifacts/RequirementAnalysisView';
import RiskAssessmentView from './artifacts/RiskAssessmentView';
import ScenariosView from './artifacts/ScenariosView';
import E2EWorkflowsView from './artifacts/E2EWorkflowsView';
import PyramidDistributionView from './artifacts/PyramidDistributionView';
import TM20TestCasesView from './artifacts/TM20TestCasesView';
import BulkImportView from './artifacts/BulkImportView';
import AutomationStrategyView from './artifacts/AutomationStrategyView';
import RTMView from './artifacts/RTMView';
import CoverageSummaryView from './artifacts/CoverageSummaryView';
import SelfQAView from './artifacts/SelfQAView';

interface Props {
  pipelineId: string;
  passId: PipelinePassId;
  passName: string;
}

function renderArtifact(passId: PipelinePassId, data: PipelineArtifactRecord['data']) {
  switch (passId) {
    case 'P1_REQUIREMENT_ANALYSIS':
      return <RequirementAnalysisView data={data as PipelineRequirementAnalysisArtifact} />;
    case 'P2_RISK_ASSESSMENT':
      return <RiskAssessmentView data={data as PipelineRiskAssessmentArtifact} />;
    case 'P3_TEST_SCENARIOS':
      return <ScenariosView data={data as PipelineScenarioArtifact} />;
    case 'P4_E2E_REQUIREMENTS':
      return <E2EWorkflowsView data={data as PipelineE2ERequirementsArtifact} />;
    case 'P5_TEST_PYRAMID':
      return <PyramidDistributionView data={data as PipelinePyramidDistributionArtifact} />;
    case 'P6_TM20_TEST_CASES':
      return <TM20TestCasesView data={data as PipelineTM20TestCasesArtifact} />;
    case 'P7_BULK_IMPORT':
      return <BulkImportView data={data as PipelineBulkImportArtifact} />;
    case 'P8_AUTOMATION_STRATEGY':
      return <AutomationStrategyView data={data as PipelineAutomationStrategyArtifact} />;
    case 'P9_RTM':
      return <RTMView data={data as PipelineRTMArtifact} />;
    case 'P10_COVERAGE':
      return <CoverageSummaryView data={data as PipelineCoverageSummaryArtifact} />;
    case 'P11_SELF_QA':
      return <SelfQAView data={data as PipelineSelfQAValidationArtifact} />;
    default:
      return null;
  }
}

/** Fetches and renders one pass's artifact, keyed by passId so each selection refetches. */
export default function ArtifactPanel({ pipelineId, passId, passName }: Props) {
  const [artifact, setArtifact] = useState<PipelineArtifactRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setArtifact(null);
    setShowRaw(false);

    pipelineApi
      .getArtifact(pipelineId, passId)
      .then((data) => {
        if (!cancelled) setArtifact(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message || 'Failed to load artifact.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pipelineId, passId]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{passName}</h2>
          {artifact && (
            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
              {artifact.artifactType} · v{artifact.artifactVersion}
            </p>
          )}
        </div>
        {artifact && (
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            {showRaw ? '← Formatted view' : 'View raw JSON'}
          </button>
        )}
      </div>

      {loading && <p className="text-xs text-gray-500">Loading artifact…</p>}

      {error && (
        <div className="bg-red-950/60 border border-red-800 rounded-lg p-3 text-xs text-red-300">{error}</div>
      )}

      {artifact && !showRaw && (
        <ArtifactErrorBoundary raw={artifact.data}>
          {renderArtifact(passId, artifact.data)}
        </ArtifactErrorBoundary>
      )}

      {artifact && showRaw && (
        <pre className="text-[11px] text-gray-300 bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-x-auto">
          {JSON.stringify(artifact.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
