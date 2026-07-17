import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import generateRouter from './routes/generate.js';
import configRouter from './routes/config.js';

const app = express();
const PORT = process.env.PORT || 3001;

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

// ── Health check ──────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────
app.use('/api', configRouter);
app.use('/api', generateLimiter, generateRouter);

// ── Global error handler ──────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  console.log(`[server] ALLOW_LOCAL_ENDPOINTS=${process.env.ALLOW_LOCAL_ENDPOINTS || 'false'}`);
});
