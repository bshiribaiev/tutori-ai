import { Router } from 'express';

export const sessionRouter = Router();

// Dev helper: current LiveAvatar credit balance.
sessionRouter.get('/credits', async (_req, res) => {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) return res.status(500).json({ error: 'HEYGEN_API_KEY missing' });
  try {
    const r = await fetch('https://api.liveavatar.com/v1/users/credits', {
      headers: { 'x-api-key': key },
    });
    const body = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'credits check failed', status: r.status, detail: body });
    res.json(JSON.parse(body).data ?? {});
  } catch (err) {
    res.status(500).json({ error: 'credits exception', detail: String(err) });
  }
});

// Dev helper: list LiveAvatar public avatars so you can copy a valid avatar_id UUID.
sessionRouter.get('/avatars', async (_req, res) => {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) return res.status(500).json({ error: 'HEYGEN_API_KEY missing' });
  try {
    const r = await fetch('https://api.liveavatar.com/v1/avatars/public?page_size=100', {
      headers: { 'x-api-key': key },
    });
    const body = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'list failed', status: r.status, detail: body });
    const parsed = JSON.parse(body);
    const slim = (parsed?.data?.results ?? []).map((a: {
      id: string; name: string; preview_url?: string; default_voice?: { id: string; name: string };
    }) => ({ id: a.id, name: a.name, preview_url: a.preview_url, default_voice: a.default_voice }));
    res.json({ count: parsed?.data?.count, avatars: slim });
  } catch (err) {
    res.status(500).json({ error: 'list avatars exception', detail: String(err) });
  }
});

// Mints a LiveAvatar session token. SDK calls start() internally.
// LITE mode: HeyGen renders avatar + lip-syncs audio from ElevenLabs Agent.
// If ELEVENLABS_AGENT_ID + ELEVENLABS_SECRET_ID are set, the agent is wired
// server-side so HeyGen talks to EL directly (no client-side audio relay).
sessionRouter.post('/start', async (req, res) => {
  const key = process.env.HEYGEN_API_KEY;
  const mode = req.body?.mode === 'teach' ? 'teach' : 'learn';
  const tutor = typeof req.body?.tutor === 'string' ? req.body.tutor : 'math';
  const secretId = process.env.ELEVENLABS_SECRET_ID;

  const learnTutorMap: Record<string, { avatarEnv: string; agentEnv: string }> = {
    math: { avatarEnv: 'HEYGEN_AVATAR_ID_MATH', agentEnv: 'ELEVENLABS_AGENT_ID_MATH' },
    history: { avatarEnv: 'HEYGEN_AVATAR_ID_HISTORY', agentEnv: 'ELEVENLABS_AGENT_ID_HISTORY' },
    interview: { avatarEnv: 'HEYGEN_AVATAR_ID_INTERVIEW', agentEnv: 'ELEVENLABS_AGENT_ID_INTERVIEW' },
    english: { avatarEnv: 'HEYGEN_AVATAR_ID_ENGLISH', agentEnv: 'ELEVENLABS_AGENT_ID_ENGLISH' },
  };

  let avatarId: string | undefined;
  let agentId: string | undefined;
  if (mode === 'teach') {
    avatarId = process.env.HEYGEN_AVATAR_ID;
    agentId = process.env.ELEVENLABS_AGENT_ID_STUDENT;
  } else {
    const slot = learnTutorMap[tutor] ?? learnTutorMap.math;
    avatarId = process.env[slot.avatarEnv] ?? process.env.HEYGEN_AVATAR_ID;
    agentId = process.env[slot.agentEnv] ?? process.env.ELEVENLABS_AGENT_ID;
  }

  if (!key) return res.status(500).json({ error: 'HEYGEN_API_KEY missing' });
  if (!avatarId) return res.status(500).json({ error: `avatar id missing for ${mode}/${tutor}` });

  const visualSessionId = typeof req.body?.visual_session_id === 'string' ? req.body.visual_session_id : undefined;

  const reqBody: Record<string, unknown> = { mode: 'LITE', avatar_id: avatarId };
  if (agentId && secretId) {
    const agentConfig: Record<string, unknown> = { secret_id: secretId, agent_id: agentId };
    if (visualSessionId) {
      // EL reads dynamic variables via templating in system prompt and tool params.
      agentConfig.dynamic_variables = { visual_session_id: visualSessionId };
      // Some HeyGen versions nest overrides differently — send both shapes.
      agentConfig.overrides = { conversation: { dynamic_variables: { visual_session_id: visualSessionId } } };
    }
    reqBody.elevenlabs_agent_config = agentConfig;
  }

  try {
    const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: { 'x-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    const resBody = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error('[session] liveavatar token failed', tokenRes.status, resBody);
      return res.status(502).json({ error: 'liveavatar token failed', status: tokenRes.status, detail: resBody });
    }
    const parsed = JSON.parse(resBody);
    const sessionToken = parsed?.data?.session_token;
    const sessionId = parsed?.data?.session_id;
    if (!sessionToken) {
      return res.status(502).json({ error: 'no session_token in response', detail: resBody });
    }
    res.json({
      session_token: sessionToken,
      session_id: sessionId,
      mode: 'LITE',
      persona: mode,
      agent_wired: Boolean(agentId && secretId),
    });
  } catch (err) {
    console.error('[session] exception', err);
    res.status(500).json({ error: 'session start failed', detail: String(err) });
  }
});
