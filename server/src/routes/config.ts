import { Router, type Request, type Response } from 'express';
import { isServiceNowConfigured } from '../services/servicenow/config.js';

const router = Router();

/**
 * GET /api/config
 * Tells the frontend which optional integrations are usable, so it can
 * conditionally render integration UI without probing individual endpoints.
 */
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    integrations: {
      serviceNowConfigured: isServiceNowConfigured(),
    },
  });
});

export default router;
