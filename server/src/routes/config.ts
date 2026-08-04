import { Router, type Request, type Response } from 'express';
import { isServiceNowConfigured } from '../services/servicenow/config.js';

const router = Router();

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length < 8) return '***';
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

/**
 * GET /api/config
 * Tells the frontend which optional integrations are usable, so it can
 * conditionally render integration UI without probing individual endpoints.
 */
router.get('/config', (_req: Request, res: Response) => {
  const rawKey = process.env.LOCAL_LLM_API_KEY ?? '';
  res.json({
    integrations: {
      serviceNowConfigured: isServiceNowConfigured(),
    },
    localLlm: {
      endpoint: process.env.LOCAL_LLM_ENDPOINT ?? '',
      model: process.env.LOCAL_LLM_MODEL ?? '',
      apiKey: maskKey(rawKey),
    },
  });
});

export default router;
