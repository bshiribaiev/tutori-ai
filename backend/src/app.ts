import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session.js';
import { tavilyRouter } from './routes/tavily.js';
import { feedbackRouter } from './routes/feedback.js';
import { visualRouter } from './routes/visual.js';

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
    tutors: {
      alex: { kind: 'illustrated', specialty: 'Generalist', name: 'Alex' },
      math: { kind: 'heygen', specialty: 'Math', name: 'Ann', has_agent: Boolean(process.env.ELEVENLABS_AGENT_ID_MATH) },
      history: { kind: 'heygen', specialty: 'History', name: 'History', has_agent: Boolean(process.env.ELEVENLABS_AGENT_ID_HISTORY) },
      interview: { kind: 'heygen', specialty: 'Interview Coach', name: 'Interview', has_agent: Boolean(process.env.ELEVENLABS_AGENT_ID_INTERVIEW) },
      english: { kind: 'heygen', specialty: 'English', name: 'English', has_agent: Boolean(process.env.ELEVENLABS_AGENT_ID_ENGLISH) },
    },
  });
});

app.use('/api/session', sessionRouter);
app.use('/api/tavily', tavilyRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/visual', visualRouter);

export default app;
