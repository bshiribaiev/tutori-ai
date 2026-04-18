import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session.js';
import { tavilyRouter } from './routes/tavily.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/api/config', (_req, res) => {
  res.json({
    elevenlabs_agent_id: process.env.ELEVENLABS_AGENT_ID ?? null,
  });
});

app.use('/api/session', sessionRouter);
app.use('/api/tavily', tavilyRouter);

export default app;
