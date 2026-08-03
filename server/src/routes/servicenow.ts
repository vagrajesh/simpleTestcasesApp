import { Router, type Request, type Response } from 'express';
import { snGet } from '../services/servicenow/client.js';
import { isServiceNowConfigured } from '../services/servicenow/config.js';
import { mapStateLabel, mapPriorityLabel } from '../services/servicenow/mapping.js';

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

export default router;
