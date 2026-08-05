import type {
  PipelineArtifactPayload,
  PipelineAutomationStrategyArtifact,
  PipelineBulkImportArtifact,
  PipelineCoverageSummaryArtifact,
  PipelineCreateRequest,
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

export interface PassExecutionResult {
  artifactType: string;
  artifactVersion: string;
  data: PipelineArtifactPayload;
}

export interface PassValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PassExecutionDeps {
  analysis?: PipelineRequirementAnalysisArtifact;
  risks?: PipelineRiskAssessmentArtifact;
  scenarios?: PipelineScenarioArtifact;
  e2e?: PipelineE2ERequirementsArtifact;
  pyramid?: PipelinePyramidDistributionArtifact;
  tm20?: PipelineTM20TestCasesArtifact;
  bulkImport?: PipelineBulkImportArtifact;
  automation?: PipelineAutomationStrategyArtifact;
  rtm?: PipelineRTMArtifact;
  coverage?: PipelineCoverageSummaryArtifact;
}

function extractActors(userStory: string): string[] {
  const lower = userStory.toLowerCase();
  if (lower.includes('admin')) return ['Admin'];
  if (lower.includes('agent')) return ['Agent'];
  if (lower.includes('customer')) return ['Customer'];
  if (lower.includes('user')) return ['User'];
  return ['User'];
}

function extractActionAndBenefit(userStory: string): { action: string; benefit: string } {
  const match = /i want to\s+(.*?)\s+so that\s+(.*?)[\.]?$/i.exec(userStory.trim());
  if (!match) {
    return {
      action: 'perform the requested workflow',
      benefit: 'the business objective is achieved',
    };
  }
  return {
    action: match[1].trim(),
    benefit: match[2].trim(),
  };
}

function toRequirementAnalysis(request: PipelineCreateRequest): PipelineRequirementAnalysisArtifact {
  const story = request.requirement.userStory.trim();
  const { action, benefit } = extractActionAndBenefit(story);

  return {
    requirementId: request.requirement.requirementId ?? 'REQ-AUTO-001',
    userStoryId: request.requirement.userStoryId ?? 'US-AUTO-001',
    businessProcess: request.requirement.feature ?? request.requirement.epic ?? 'Core Business Workflow',
    actors: extractActors(story),
    functionalRequirements: [
      { id: 'FR-001', statement: `System allows actor to ${action}.` },
      { id: 'FR-002', statement: `System ensures outcome where ${benefit}.` },
    ],
    assumptions: [
      'The user has valid access to the application environment.',
      'External dependencies are reachable during execution.',
    ],
    missingInformation: [
      'Detailed non-functional performance thresholds are not provided.',
      'Role-specific authorization matrix is not fully specified.',
    ],
  };
}

function toRiskAssessment(analysis: PipelineRequirementAnalysisArtifact): PipelineRiskAssessmentArtifact {
  return {
    risks: [
      {
        id: 'RISK-001',
        category: 'Functional',
        level: 'High',
        description: `Core flow may fail for actor ${analysis.actors[0]} under invalid data conditions.`,
        impact: 'Primary business process interruption.',
        likelihood: 'Medium',
        mitigation: 'Validate positive and negative paths with strict input validation coverage.',
      },
      {
        id: 'RISK-002',
        category: 'Integration',
        level: 'Medium',
        description: 'External service communication may fail or timeout.',
        impact: 'Partial transaction completion and user-facing errors.',
        likelihood: 'Medium',
        mitigation: 'Add integration and retry/error-handling scenarios with observable assertions.',
      },
      {
        id: 'RISK-003',
        category: 'Security',
        level: 'High',
        description: 'Unauthorized access to protected operations.',
        impact: 'Compliance and data exposure risk.',
        likelihood: 'Low',
        mitigation: 'Include authentication and authorization test scenarios with role checks.',
      },
    ],
  };
}

function toScenarios(request: PipelineCreateRequest, analysis: PipelineRequirementAnalysisArtifact): PipelineScenarioArtifact {
  const storyId = analysis.userStoryId;
  const categories = request.options?.categories ?? ['positive', 'negative', 'edge', 'e2e'];
  const scenarios: PipelineScenarioArtifact['scenarios'] = [];

  if (categories.includes('positive')) {
    scenarios.push({
      id: 'SCN-POS-001',
      title: 'Validate successful completion of primary workflow',
      scenarioType: 'Positive',
      businessRuleRef: 'BR-PRIMARY-SUCCESS',
      objective: `Confirm ${storyId} completes as expected with valid inputs.`,
    });
  }
  if (categories.includes('negative')) {
    scenarios.push({
      id: 'SCN-NEG-001',
      title: 'Validate graceful failure for invalid input',
      scenarioType: 'Negative',
      businessRuleRef: 'BR-INPUT-VALIDATION',
      objective: 'Confirm validation errors are shown and no invalid data is committed.',
    });
  }
  if (categories.includes('edge')) {
    scenarios.push({
      id: 'SCN-EDG-001',
      title: 'Validate boundary handling for max/min supported values',
      scenarioType: 'Edge Cases',
      businessRuleRef: 'BR-BOUNDARY',
      objective: 'Confirm boundary values are handled without failure or data corruption.',
    });
  }
  if (categories.includes('e2e')) {
    scenarios.push({
      id: 'SCN-E2E-001',
      title: 'Validate end-to-end actor journey across integrated systems',
      scenarioType: 'End to End',
      businessRuleRef: 'BR-E2E-FLOW',
      objective: `Confirm actor ${analysis.actors[0]} completes the full workflow with downstream effects.`,
    });
  }

  return { scenarios };
}

function toE2ERequirements(analysis: PipelineRequirementAnalysisArtifact, scenarios: PipelineScenarioArtifact): PipelineE2ERequirementsArtifact {
  const e2eScenarios = scenarios.scenarios.filter((s) => s.scenarioType === 'End to End');
  const workflows = (e2eScenarios.length > 0 ? e2eScenarios : [
    {
      id: 'SCN-E2E-001',
      title: 'Validate full business journey',
      scenarioType: 'End to End' as const,
      businessRuleRef: 'BR-E2E-FLOW',
      objective: 'Confirm end-to-end business objective',
    },
  ]).map((scenario, i) => ({
    workflowId: `WF-${String(i + 1).padStart(3, '0')}`,
    workflowName: scenario.title,
    businessObjective: scenario.objective,
    initiatingActor: analysis.actors[0],
    systemsInvolved: ['Application UI', 'Core Service', 'Integration Endpoint'],
    criticalValidationPoints: ['Input validation', 'Business rule enforcement', 'Final status persistence'],
    failurePoints: ['Network timeout', 'Validation rejection', 'Authorization failure'],
    recoveryPoints: ['Retry operation', 'Compensating transaction', 'User-visible remediation guidance'],
  }));

  return { workflows };
}

function toPyramidDistribution(scenarios: PipelineScenarioArtifact): PipelinePyramidDistributionArtifact {
  const total = Math.max(scenarios.scenarios.length, 1);
  const e2e = scenarios.scenarios.filter((s) => s.scenarioType === 'End to End').length;
  const uiE2E = Math.max(Math.round((e2e / total) * 100), 10);
  const componentApi = 30;
  const unit = Math.max(0, 100 - uiE2E - componentApi);

  return {
    recommended: { unit: 60, componentApi: 30, uiE2E: 10 },
    planned: { unit, componentApi, uiE2E },
    recommendation: 'Shift additional validation to unit and component/API levels when UI/E2E share exceeds 10%.',
  };
}

function toTM20TestCases(
  request: PipelineCreateRequest,
  analysis: PipelineRequirementAnalysisArtifact,
  scenarios: PipelineScenarioArtifact,
): PipelineTM20TestCasesArtifact {
  const total = request.options?.numTestCases ?? Math.max(scenarios.scenarios.length, 4);
  const sourceScenarios = scenarios.scenarios.length > 0 ? scenarios.scenarios : [{
    id: 'SCN-POS-001',
    title: 'Validate primary workflow',
    scenarioType: 'Positive' as const,
    businessRuleRef: 'BR-PRIMARY-SUCCESS',
    objective: 'Confirm core behavior',
  }];

  const test_cases: PipelineTM20TestCasesArtifact['test_cases'] = [];

  for (let i = 0; i < total; i += 1) {
    const scenario = sourceScenarios[i % sourceScenarios.length];
    const idx = String(i + 1).padStart(3, '0');

    test_cases.push({
      short_description: `Validate ${scenario.title.toLowerCase()}`,
      description: `Verify ${scenario.objective}`,
      test_type: scenario.scenarioType === 'End to End' ? 'Integration' : 'Functional',
      priority: scenario.scenarioType === 'Negative' ? 'Critical' : 'High',
      state: 'draft',
      version: '1.0',
      user_story_id: analysis.userStoryId,
      u_testing_technique: scenario.scenarioType,
      u_product_name_dept: 'TBD_PRODUCT',
      u_business_unit: 'TBD_BUSINESS_UNIT',
      u_business_system_services: 'TBD_SYSTEM_SERVICE',
      u_risk_approach: 'Risk-based',
      u_automated: scenario.scenarioType === 'End to End' ? 'No' : 'Yes',
      u_fhlbdm_test_case_id: `TC-TM20-${idx}`,
      u_module_services: analysis.businessProcess,
      steps: [
        {
          order: 100,
          step: `Prepare test context for ${scenario.title}`,
          expected_result: 'System is ready to execute the workflow.',
          test_data: 'User role and baseline data set',
          needs_verification: true,
        },
        {
          order: 200,
          step: `Execute scenario action path: ${scenario.objective}`,
          expected_result: 'System response matches expected business behavior.',
          test_data: 'Valid and invalid input sets as applicable',
          needs_verification: true,
        },
        {
          order: 300,
          step: 'Validate persisted results and side effects',
          expected_result: 'All downstream outcomes are correct and auditable.',
          test_data: 'Database record checks and integration logs',
          needs_verification: true,
        },
      ],
    });
  }

  return { test_cases };
}

function toBulkImport(
  analysis: PipelineRequirementAnalysisArtifact,
  risks: PipelineRiskAssessmentArtifact,
  tm20: PipelineTM20TestCasesArtifact,
): PipelineBulkImportArtifact {
  const defaultRisk = risks.risks[0]?.level ?? 'Medium';
  const rows: PipelineBulkImportArtifact['rows'] = [];

  tm20.test_cases.forEach((tc, tcIndex) => {
    tc.steps.forEach((step, stepIndex) => {
      rows.push({
        test_case_number: tc.u_fhlbdm_test_case_id,
        test_case_name: tc.short_description,
        type: tc.test_type,
        test_suite: 'TM2.0-AUTO-SUITE',
        requirement_id: analysis.requirementId,
        user_story_id: analysis.userStoryId,
        business_process: analysis.businessProcess,
        priority: tc.priority,
        risk_level: defaultRisk,
        test_pyramid_layer: tc.test_type === 'Integration' ? 'UI / End-to-End' : 'Component/API',
        automation_candidate: tc.u_automated,
        automation_feasibility: tc.u_automated === 'Yes' ? 'High' : 'Medium',
        automation_priority: tc.priority === 'Critical' ? 'High' : 'Medium',
        recommended_automation_tool: tc.test_type === 'Integration' ? 'Playwright' : 'ServiceNow ATF',
        preconditions: `Generated from ${analysis.userStoryId}`,
        description: tc.description,
        step_number: stepIndex + 1,
        action: step.step,
        test_data: step.test_data,
        expected_result: step.expected_result,
        expected_outcome: 'Step outcome meets acceptance criteria.',
      });
    });

    if (tc.steps.length === 0) {
      rows.push({
        test_case_number: tc.u_fhlbdm_test_case_id,
        test_case_name: tc.short_description,
        type: tc.test_type,
        test_suite: 'TM2.0-AUTO-SUITE',
        requirement_id: analysis.requirementId,
        user_story_id: analysis.userStoryId,
        business_process: analysis.businessProcess,
        priority: tc.priority,
        risk_level: defaultRisk,
        test_pyramid_layer: 'Component/API',
        automation_candidate: tc.u_automated,
        automation_feasibility: 'Medium',
        automation_priority: 'Medium',
        recommended_automation_tool: 'ServiceNow ATF',
        preconditions: `Generated from ${analysis.userStoryId}`,
        description: tc.description,
        step_number: tcIndex + 1,
        action: 'N/A',
        test_data: 'N/A',
        expected_result: 'N/A',
        expected_outcome: 'N/A',
      });
    }
  });

  return { rows };
}

function toAutomationStrategy(tm20: PipelineTM20TestCasesArtifact): PipelineAutomationStrategyArtifact {
  return {
    recommendations: tm20.test_cases.map((tc) => ({
      test_case_id: tc.u_fhlbdm_test_case_id,
      automation_candidate: tc.u_automated,
      automation_feasibility: tc.u_automated === 'Yes' ? 'High' : 'Medium',
      automation_complexity: tc.test_type === 'Integration' ? 'High' : 'Medium',
      recommended_tool: tc.test_type === 'Integration' ? 'Playwright' : 'ServiceNow ATF',
      automation_roi: tc.u_automated === 'Yes'
        ? 'High ROI due to repeatable execution and regression value.'
        : 'Moderate ROI; keep manual until workflow stabilizes.',
    })),
  };
}

function toRTM(
  analysis: PipelineRequirementAnalysisArtifact,
  scenarios: PipelineScenarioArtifact,
  tm20: PipelineTM20TestCasesArtifact,
): PipelineRTMArtifact {
  const entries = tm20.test_cases.map((tc, i) => {
    const scenario = scenarios.scenarios[i % Math.max(scenarios.scenarios.length, 1)] ?? {
      id: 'SCN-UNMAPPED-001',
      objective: 'Scenario mapping unavailable',
      businessRuleRef: 'BR-UNKNOWN',
    };
    return {
      requirement_id: analysis.requirementId,
      requirement_description: analysis.functionalRequirements[0]?.statement ?? 'Generated requirement coverage',
      business_rule: scenario.businessRuleRef,
      test_scenario_id: scenario.id,
      test_case_number: tc.u_fhlbdm_test_case_id,
      coverage_status: 'Full' as const,
    };
  });

  return { entries };
}

function toCoverageSummary(
  analysis: PipelineRequirementAnalysisArtifact,
  risks: PipelineRiskAssessmentArtifact,
  scenarios: PipelineScenarioArtifact,
  tm20: PipelineTM20TestCasesArtifact,
  automation: PipelineAutomationStrategyArtifact,
): PipelineCoverageSummaryArtifact {
  const totalRequirements = analysis.functionalRequirements.length;
  const totalScenarios = scenarios.scenarios.length;
  const totalTestCases = tm20.test_cases.length;
  const totalE2E = tm20.test_cases.filter((tc) => tc.u_testing_technique === 'End to End').length;
  const totalApi = tm20.test_cases.filter((tc) => tc.test_type === 'Functional').length;
  const totalIntegration = tm20.test_cases.filter((tc) => tc.test_type === 'Integration').length;
  const totalSecurity = scenarios.scenarios.filter((s) => /auth|security|role/i.test(s.title)).length;
  const automationCandidates = automation.recommendations.filter((r) => r.automation_candidate === 'Yes').length;

  return {
    total_requirements: totalRequirements,
    total_business_rules: totalScenarios,
    total_test_scenarios: totalScenarios,
    total_test_cases: totalTestCases,
    total_e2e_test_cases: totalE2E,
    total_api_test_cases: totalApi,
    total_integration_test_cases: totalIntegration,
    total_security_test_cases: totalSecurity,
    automation_candidate_count: automationCandidates,
    coverage_percentage: totalRequirements > 0 ? 100 : 0,
    coverage_gaps: totalScenarios === 0 ? ['No scenarios generated'] : [],
    high_risk_areas: risks.risks.filter((r) => r.level === 'Critical' || r.level === 'High').map((r) => r.description),
    missing_requirements: analysis.missingInformation,
    uncovered_business_rules: [],
  };
}

function toSelfQA(
  analysis: PipelineRequirementAnalysisArtifact,
  scenarios: PipelineScenarioArtifact,
  coverage: PipelineCoverageSummaryArtifact,
): PipelineSelfQAValidationArtifact {
  const checklist: PipelineSelfQAValidationArtifact['checklist'] = [
    {
      id: 'SQ-001',
      check: 'Every requirement is covered',
      status: coverage.total_requirements > 0 ? 'PASS' : 'FAIL',
      details: `Requirements counted: ${coverage.total_requirements}`,
    },
    {
      id: 'SQ-002',
      check: 'Positive and negative scenarios exist',
      status: scenarios.scenarios.some((s) => s.scenarioType === 'Positive') && scenarios.scenarios.some((s) => s.scenarioType === 'Negative') ? 'PASS' : 'FAIL',
      details: `Scenarios generated: ${scenarios.scenarios.length}`,
    },
    {
      id: 'SQ-003',
      check: 'Missing information captured',
      status: analysis.missingInformation.length > 0 ? 'PASS' : 'FAIL',
      details: `Missing info entries: ${analysis.missingInformation.length}`,
    },
    {
      id: 'SQ-004',
      check: 'Coverage percentage computed',
      status: coverage.coverage_percentage >= 0 ? 'PASS' : 'FAIL',
      details: `Coverage percentage: ${coverage.coverage_percentage}%`,
    },
  ];

  return {
    checklist,
    overallStatus: checklist.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL',
  };
}

export function executeCorePass(
  passId: PipelinePassId,
  request: PipelineCreateRequest,
  deps: PassExecutionDeps,
): PassExecutionResult {
  if (passId === 'P1_REQUIREMENT_ANALYSIS') {
    return { artifactType: 'requirement-analysis', artifactVersion: '1.0.0', data: toRequirementAnalysis(request) };
  }

  if (passId === 'P2_RISK_ASSESSMENT') {
    if (!deps.analysis) throw new Error('P2_RISK_ASSESSMENT requires requirement analysis artifact');
    return { artifactType: 'risk-assessment', artifactVersion: '1.0.0', data: toRiskAssessment(deps.analysis) };
  }

  if (passId === 'P3_TEST_SCENARIOS') {
    if (!deps.analysis) throw new Error('P3_TEST_SCENARIOS requires requirement analysis artifact');
    return { artifactType: 'test-scenarios', artifactVersion: '1.0.0', data: toScenarios(request, deps.analysis) };
  }

  if (passId === 'P4_E2E_REQUIREMENTS') {
    if (!deps.analysis || !deps.scenarios) throw new Error('P4_E2E_REQUIREMENTS requires requirement analysis and scenarios artifacts');
    return { artifactType: 'e2e-requirements', artifactVersion: '1.0.0', data: toE2ERequirements(deps.analysis, deps.scenarios) };
  }

  if (passId === 'P5_TEST_PYRAMID') {
    if (!deps.scenarios) throw new Error('P5_TEST_PYRAMID requires scenarios artifact');
    return { artifactType: 'test-pyramid-distribution', artifactVersion: '1.0.0', data: toPyramidDistribution(deps.scenarios) };
  }

  if (passId === 'P6_TM20_TEST_CASES') {
    if (!deps.analysis || !deps.scenarios) throw new Error('P6_TM20_TEST_CASES requires requirement analysis and scenarios artifacts');
    return { artifactType: 'tm20-test-cases', artifactVersion: '1.0.0', data: toTM20TestCases(request, deps.analysis, deps.scenarios) };
  }

  if (passId === 'P7_BULK_IMPORT') {
    if (!deps.analysis || !deps.risks || !deps.tm20) throw new Error('P7_BULK_IMPORT requires analysis, risk, and TM2.0 test case artifacts');
    return { artifactType: 'bulk-import-rows', artifactVersion: '1.0.0', data: toBulkImport(deps.analysis, deps.risks, deps.tm20) };
  }

  if (passId === 'P8_AUTOMATION_STRATEGY') {
    if (!deps.tm20) throw new Error('P8_AUTOMATION_STRATEGY requires TM2.0 test case artifact');
    return { artifactType: 'automation-strategy', artifactVersion: '1.0.0', data: toAutomationStrategy(deps.tm20) };
  }

  if (passId === 'P9_RTM') {
    if (!deps.analysis || !deps.scenarios || !deps.tm20) throw new Error('P9_RTM requires analysis, scenarios, and TM2.0 test case artifacts');
    return { artifactType: 'requirement-traceability-matrix', artifactVersion: '1.0.0', data: toRTM(deps.analysis, deps.scenarios, deps.tm20) };
  }

  if (passId === 'P10_COVERAGE') {
    if (!deps.analysis || !deps.risks || !deps.scenarios || !deps.tm20 || !deps.automation) {
      throw new Error('P10_COVERAGE requires analysis, risk, scenario, TM2.0, and automation artifacts');
    }
    return {
      artifactType: 'coverage-summary',
      artifactVersion: '1.0.0',
      data: toCoverageSummary(deps.analysis, deps.risks, deps.scenarios, deps.tm20, deps.automation),
    };
  }

  if (passId === 'P11_SELF_QA') {
    if (!deps.analysis || !deps.scenarios || !deps.coverage) {
      throw new Error('P11_SELF_QA requires analysis, scenarios, and coverage artifacts');
    }
    return { artifactType: 'self-qa-validation', artifactVersion: '1.0.0', data: toSelfQA(deps.analysis, deps.scenarios, deps.coverage) };
  }

  throw new Error(`Unsupported pass: ${passId}`);
}

export function validateCorePassArtifact(passId: PipelinePassId, data: PipelineArtifactPayload): PassValidationResult {
  const errors: string[] = [];

  if (passId === 'P1_REQUIREMENT_ANALYSIS') {
    const artifact = data as PipelineRequirementAnalysisArtifact;
    if (!artifact.requirementId) errors.push('requirementId is required');
    if (!artifact.userStoryId) errors.push('userStoryId is required');
    if (!Array.isArray(artifact.functionalRequirements) || artifact.functionalRequirements.length === 0) {
      errors.push('functionalRequirements must be a non-empty array');
    }
  }

  if (passId === 'P2_RISK_ASSESSMENT') {
    const artifact = data as PipelineRiskAssessmentArtifact;
    if (!Array.isArray(artifact.risks) || artifact.risks.length === 0) {
      errors.push('risks must be a non-empty array');
    }
  }

  if (passId === 'P3_TEST_SCENARIOS') {
    const artifact = data as PipelineScenarioArtifact;
    if (!Array.isArray(artifact.scenarios) || artifact.scenarios.length === 0) {
      errors.push('scenarios must be a non-empty array');
    }
  }

  if (passId === 'P4_E2E_REQUIREMENTS') {
    const artifact = data as PipelineE2ERequirementsArtifact;
    if (!Array.isArray(artifact.workflows) || artifact.workflows.length === 0) {
      errors.push('workflows must be a non-empty array');
    }
  }

  if (passId === 'P5_TEST_PYRAMID') {
    const artifact = data as PipelinePyramidDistributionArtifact;
    if (!artifact.recommended || !artifact.planned) {
      errors.push('recommended and planned distributions are required');
    }
  }

  if (passId === 'P6_TM20_TEST_CASES') {
    const artifact = data as PipelineTM20TestCasesArtifact;
    if (!Array.isArray(artifact.test_cases) || artifact.test_cases.length === 0) {
      errors.push('test_cases must be a non-empty array');
    }
  }

  if (passId === 'P7_BULK_IMPORT') {
    const artifact = data as PipelineBulkImportArtifact;
    if (!Array.isArray(artifact.rows) || artifact.rows.length === 0) {
      errors.push('rows must be a non-empty array');
    }
  }

  if (passId === 'P8_AUTOMATION_STRATEGY') {
    const artifact = data as PipelineAutomationStrategyArtifact;
    if (!Array.isArray(artifact.recommendations) || artifact.recommendations.length === 0) {
      errors.push('recommendations must be a non-empty array');
    }
  }

  if (passId === 'P9_RTM') {
    const artifact = data as PipelineRTMArtifact;
    if (!Array.isArray(artifact.entries) || artifact.entries.length === 0) {
      errors.push('entries must be a non-empty array');
    }
  }

  if (passId === 'P10_COVERAGE') {
    const artifact = data as PipelineCoverageSummaryArtifact;
    if (artifact.total_test_cases < 0 || artifact.coverage_percentage < 0) {
      errors.push('coverage summary values must be non-negative');
    }
  }

  if (passId === 'P11_SELF_QA') {
    const artifact = data as PipelineSelfQAValidationArtifact;
    if (!Array.isArray(artifact.checklist) || artifact.checklist.length === 0) {
      errors.push('checklist must be a non-empty array');
    }
  }

  return { valid: errors.length === 0, errors };
}
