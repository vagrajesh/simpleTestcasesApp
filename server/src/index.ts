import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import generateRouter from './routes/generate.js';
import configRouter from './routes/config.js';
import servicenowRouter from './routes/servicenow.js';

const app = express();
const PORT: number = Number(process.env.PORT) || 3001;

// ── CORS ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// ── Body parser ───────────────────────────────────────
app.use(express.json({ limit: '32kb' }));

// ── Rate limiting ─────────────────────────────────────
// Global: 60 req/min per IP across all routes
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down.' },
}));

// Stricter limit on the generation endpoint (10 req/min per IP)
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many generation requests. Please wait a moment.' },
});

// Separate limit for ServiceNow calls (20 req/min per IP)
const servicenowLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many ServiceNow requests. Please wait a moment.' },
});

// ── Health check ──────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────
app.use('/api', configRouter);
app.use('/api', generateLimiter, generateRouter);
app.use('/api', servicenowLimiter, servicenowRouter);

// ── Global error handler ──────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  console.log(`[server] ALLOW_LOCAL_ENDPOINTS=${process.env.ALLOW_LOCAL_ENDPOINTS || 'false'}`);
});
