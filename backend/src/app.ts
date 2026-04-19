import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session.js';
import { tavilyRouter } from './routes/tavily.js';
import { feedbackRouter } from './routes/feedback.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/api/config', (_req, res) => {
  res.json({
    elevenlabs_agent_id: process.env.ELEVENLABS_AGENT_ID ?? null,
    elevenlabs_agent_id_student: process.env.ELEVENLABS_AGENT_ID_STUDENT ?? null,
    elevenlabs_agent_id_tutor_alex: process.env.ELEVENLABS_AGENT_ID_TUTOR_ALEX ?? null,
  });
});

app.use('/api/session', sessionRouter);
app.use('/api/tavily', tavilyRouter);
app.use('/api/feedback', feedbackRouter);

export default app;
