import type { PipelinePassId } from '@shared/types';

export interface PipelinePassCatalogItem {
  passId: PipelinePassId;
  name: string;
  order: number;
}

export const PIPELINE_PASS_CATALOG: PipelinePassCatalogItem[] = [
  { passId: 'P1_REQUIREMENT_ANALYSIS', name: 'Requirement Analysis', order: 1 },
  { passId: 'P2_RISK_ASSESSMENT', name: 'Risk Assessment', order: 2 },
  { passId: 'P3_TEST_SCENARIOS', name: 'Test Scenarios', order: 3 },
  { passId: 'P4_E2E_REQUIREMENTS', name: 'E2E Requirements', order: 4 },
  { passId: 'P5_TEST_PYRAMID', name: 'Test Pyramid Classification', order: 5 },
  { passId: 'P6_TM20_TEST_CASES', name: 'TM2.0 Test Cases', order: 6 },
  { passId: 'P7_BULK_IMPORT', name: 'Bulk Import Rows', order: 7 },
  { passId: 'P8_AUTOMATION_STRATEGY', name: 'Automation Strategy', order: 8 },
  { passId: 'P9_RTM', name: 'Requirement Traceability Matrix', order: 9 },
  { passId: 'P10_COVERAGE', name: 'Coverage Analysis', order: 10 },
  { passId: 'P11_SELF_QA', name: 'Self-QA Validation', order: 11 },
];

export const DEFAULT_REVIEW_CHECKPOINTS: PipelinePassId[] = [
  'P1_REQUIREMENT_ANALYSIS',
  'P6_TM20_TEST_CASES',
  'P11_SELF_QA',
];
