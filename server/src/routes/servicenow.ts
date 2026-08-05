import { Router, type Request, type Response } from 'express';
import { snGet } from '../services/servicenow/client.js';
import { isServiceNowConfigured } from '../services/servicenow/config.js';
import {
  mapStateLabel,
  mapPriorityLabel,
  mapPriorityToServiceNow,
  mapTM20TestTypeToServiceNow,
} from '../services/servicenow/mapping.js';
import { pipelineOrchestrator } from '../services/pipeline/orchestrator.js';

const router = Router();

const STORY_FIELDS = 'sys_id,number,short_description,description,state,priority,acceptance_criteria,epic';
const EPIC_FIELDS = 'sys_id,number,short_description';

interface EpicRef {
  sysId: string;
  number: string;
  title: string;
}

interface RawSnRecord {
  sys_id?: string;
  number?: string;
  short_description?: string;
  description?: string;
  state?: string;
  priority?: string;
  acceptance_criteria?: string;
  epic?: string;
  model?: string;
}

interface SnListResponse {
  result?: RawSnRecord[];
}

interface SnSingleResponse {
  result?: RawSnRecord;
}

interface PreflightTableCheck {
  table: string;
  ok: boolean;
  error?: string;
}

interface ValidateExportRequest {
  pipelineId?: string;
  storySysId?: string;
}

interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

// Reference-field values come back as a bare sys_id string from the Table API
// (no sysparm_display_value requested), so cache lookups by that string.
const epicCache = new Map<string, EpicRef | null>();

async function resolveEpic(epicSysId: string | undefined): Promise<EpicRef | null> {
  if (!epicSysId) return null;
  if (epicCache.has(epicSysId)) return epicCache.get(epicSysId) ?? null;

  let epic: EpicRef | null;
  try {
    const data = await snGet(`/api/now/table/rm_epic/${epicSysId}`, { sysparm_fields: EPIC_FIELDS }) as SnSingleResponse;
    epic = data?.result
      ? { sysId: data.result.sys_id ?? '', number: data.result.number ?? '', title: data.result.short_description ?? '' }
      : null;
  } catch {
    // A broken/inaccessible epic reference shouldn't fail the whole story list.
    epic = null;
  }
  epicCache.set(epicSysId, epic);
  return epic;
}

/**
 * GET /api/servicenow/stories
 * Lists open rm_story records, with epic references resolved to number/title.
 */
router.get('/servicenow/stories', async (_req: Request, res: Response) => {
  if (!isServiceNowConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'ServiceNow is not configured on this server. Set SERVICENOW_INSTANCE_URL, SERVICENOW_CLIENT_ID, and SERVICENOW_CLIENT_SECRET.',
    });
  }

  let data: SnListResponse;
  try {
    data = await snGet('/api/now/table/rm_story', {
      sysparm_limit: 50,
      sysparm_query: 'state!=7^ORDERBYDESCsys_created_on',
      sysparm_fields: STORY_FIELDS,
    }) as SnListResponse;
  } catch (err) {
    return res.status(502).json({ success: false, error: `Failed to fetch ServiceNow stories: ${(err as Error).message}` });
  }

  const rawStories: RawSnRecord[] = Array.isArray(data?.result) ? data.result : [];

  const stories = [];
  for (const story of rawStories) {
    const epic = await resolveEpic(story.epic);
    stories.push({
      sysId: story.sys_id,
      number: story.number,
      shortDescription: story.short_description,
      description: story.description,
      state: mapStateLabel(story.state),
      priority: mapPriorityLabel(story.priority),
      acceptanceCriteria: story.acceptance_criteria,
      epic,
      source: 'servicenow' as const,
    });
  }

  res.json({ success: true, stories });
});

/**
 * GET /api/servicenow/tm20/preflight
 * Validates ServiceNow connectivity and minimum TM2.0 table accessibility.
 */
router.get('/servicenow/tm20/preflight', async (_req: Request, res: Response) => {
  if (!isServiceNowConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'ServiceNow is not configured on this server. Set SERVICENOW_INSTANCE_URL, SERVICENOW_CLIENT_ID, and SERVICENOW_CLIENT_SECRET.',
    });
  }

  const tables = [
    'sn_test_management_test',
    'sn_test_management_test_version',
    'sn_test_management_step',
    'sn_test_management_m2m_task_test',
    'rm_story',
  ];

  const checks: PreflightTableCheck[] = [];
  for (const table of tables) {
    try {
      await snGet(`/api/now/table/${table}`, {
        sysparm_limit: 1,
        sysparm_fields: 'sys_id',
      });
      checks.push({ table, ok: true });
    } catch (err) {
      checks.push({ table, ok: false, error: (err as Error).message });
    }
  }

  const ok = checks.every((c) => c.ok);
  return res.status(ok ? 200 : 502).json({
    success: ok,
    checks,
    message: ok
      ? 'TM2.0 preflight passed: required tables are reachable.'
      : 'TM2.0 preflight failed for one or more required tables.',
  });
});

/**
 * POST /api/servicenow/tm20/validate-export-payload
 * Validates pipeline TM2.0 artifacts and mapping readiness before export.
 */
router.post('/servicenow/tm20/validate-export-payload', async (req: Request, res: Response) => {
  const body = req.body as ValidateExportRequest;
  const issues: ValidationIssue[] = [];

  if (!body.pipelineId || typeof body.pipelineId !== 'string') {
    return res.status(400).json({ success: false, error: 'pipelineId is required and must be a string' });
  }

  const artifactResult = pipelineOrchestrator.getArtifactByPass(body.pipelineId, 'P6_TM20_TEST_CASES');
  if (!artifactResult) {
    return res.status(404).json({
      success: false,
      error: `TM2.0 test case artifact not found for pipeline ${body.pipelineId}. Execute pipeline pass P6 first.`,
    });
  }

  const payload = artifactResult.artifact.data;
  const testCases = (payload as { test_cases?: unknown[] }).test_cases;
  if (!Array.isArray(testCases) || testCases.length === 0) {
    return res.status(422).json({
      success: false,
      error: 'Artifact contains no test_cases to export.',
    });
  }

  type CaseCandidate = {
    short_description?: unknown;
    description?: unknown;
    test_type?: unknown;
    priority?: unknown;
    state?: unknown;
    version?: unknown;
    u_fhlbdm_test_case_id?: unknown;
    steps?: Array<{ order?: unknown; step?: unknown; expected_result?: unknown; test_data?: unknown }>;
  };

  for (const [i, raw] of testCases.entries()) {
    const tc = raw as CaseCandidate;
    if (!tc.short_description || typeof tc.short_description !== 'string') {
      issues.push({ level: 'error', code: 'MISSING_SHORT_DESCRIPTION', message: `test_cases[${i}] short_description is required` });
    }
    if (!tc.description || typeof tc.description !== 'string') {
      issues.push({ level: 'error', code: 'MISSING_DESCRIPTION', message: `test_cases[${i}] description is required` });
    }
    if (!tc.test_type || typeof tc.test_type !== 'string') {
      issues.push({ level: 'error', code: 'MISSING_TEST_TYPE', message: `test_cases[${i}] test_type is required` });
    }
    if (!tc.priority || typeof tc.priority !== 'string') {
      issues.push({ level: 'error', code: 'MISSING_PRIORITY', message: `test_cases[${i}] priority is required` });
    }
    if (!Array.isArray(tc.steps) || tc.steps.length === 0) {
      issues.push({ level: 'error', code: 'MISSING_STEPS', message: `test_cases[${i}] steps must be a non-empty array` });
    } else {
      for (const [j, step] of tc.steps.entries()) {
        if (typeof step.order !== 'number') {
          issues.push({ level: 'error', code: 'STEP_ORDER_INVALID', message: `test_cases[${i}].steps[${j}] order must be a number` });
        }
        if (!step.step || typeof step.step !== 'string') {
          issues.push({ level: 'error', code: 'STEP_ACTION_INVALID', message: `test_cases[${i}].steps[${j}] step is required` });
        }
        if (!step.expected_result || typeof step.expected_result !== 'string') {
          issues.push({ level: 'error', code: 'STEP_EXPECTED_RESULT_INVALID', message: `test_cases[${i}].steps[${j}] expected_result is required` });
        }
        if (!step.test_data || typeof step.test_data !== 'string') {
          issues.push({ level: 'warning', code: 'STEP_TEST_DATA_EMPTY', message: `test_cases[${i}].steps[${j}] test_data is empty or invalid` });
        }
      }
    }

    const priorityCode = mapPriorityToServiceNow(String(tc.priority));
    if (!priorityCode || !['1', '2', '3', '4', '5'].includes(priorityCode)) {
      issues.push({ level: 'error', code: 'PRIORITY_MAPPING_INVALID', message: `test_cases[${i}] priority mapping is invalid` });
    }

    const mappedType = mapTM20TestTypeToServiceNow(String(tc.test_type));
    if (!mappedType) {
      issues.push({ level: 'error', code: 'TEST_TYPE_MAPPING_INVALID', message: `test_cases[${i}] test_type mapping is invalid` });
    }
  }

  if (body.storySysId !== undefined) {
    if (typeof body.storySysId !== 'string' || body.storySysId.trim().length === 0) {
      issues.push({ level: 'error', code: 'STORY_SYS_ID_INVALID', message: 'storySysId must be a non-empty string when provided' });
    } else if (!isServiceNowConfigured()) {
      issues.push({ level: 'warning', code: 'SERVICENOW_NOT_CONFIGURED', message: 'ServiceNow is not configured; storySysId existence was not verified' });
    } else {
      try {
        const story = await snGet(`/api/now/table/rm_story/${body.storySysId}`, { sysparm_fields: 'sys_id,number,short_description' }) as SnSingleResponse;
        if (!story?.result?.sys_id) {
          issues.push({ level: 'error', code: 'STORY_NOT_FOUND', message: `storySysId ${body.storySysId} not found in rm_story` });
        }
      } catch (err) {
        issues.push({ level: 'error', code: 'STORY_LOOKUP_FAILED', message: `Failed to verify storySysId: ${(err as Error).message}` });
      }
    }
  }

  const hasErrors = issues.some((i) => i.level === 'error');
  return res.status(hasErrors ? 422 : 200).json({
    success: !hasErrors,
    pipelineId: body.pipelineId,
    testCaseCount: testCases.length,
    issues,
    message: hasErrors
      ? 'Export validation failed. Resolve errors before pushing to ServiceNow.'
      : 'Export validation passed. Payload is ready for ServiceNow TM2.0 export.',
  });
});

export default router;
