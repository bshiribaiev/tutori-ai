import { Router } from 'express';
import type { Response } from 'express';

export const visualRouter = Router();

// In-memory map of visual_session_id → SSE response stream.
// Fine for hackathon single-instance usage; not cross-instance on Vercel.
const clients = new Map<string, Response>();

// SSE subscribe: browser opens this for the duration of its session.
visualRouter.get('/stream', (req, res) => {
  const sid = String(req.query.sid ?? '');
  if (!sid) return res.status(400).end('sid required');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`event: ready\ndata: {"sid":"${sid}"}\n\n`);

  // Evict any stale client under the same sid (reconnect).
  const prev = clients.get(sid);
  if (prev && prev !== res) {
    try { prev.end(); } catch { /* ignore */ }
  }
  clients.set(sid, res);
  console.log('[visual] SSE open', sid, 'clients:', clients.size);

  const ping = setInterval(() => {
    try { res.write(`event: ping\ndata: {}\n\n`); } catch { /* ignore */ }
  }, 20_000);

  req.on('close', () => {
    clearInterval(ping);
    if (clients.get(sid) === res) clients.delete(sid);
    console.log('[visual] SSE close', sid, 'clients:', clients.size);
  });
});

// Webhook for EL server tool. EL posts {visual_session_id, type, title, ...payload}.
visualRouter.post('/push', (req, res) => {
  const body = req.body ?? {};
  const sid: string | undefined = body.visual_session_id;
  if (!sid) return res.status(400).json({ error: 'visual_session_id required' });

  // Everything except the routing key is the visual spec itself.
  const { visual_session_id: _drop, ...spec } = body;
  void _drop;

  const client = clients.get(sid);
  if (!client) {
    console.warn('[visual] no SSE client for sid', sid, 'known:', [...clients.keys()]);
    return res.json({ status: 'no_client' });
  }

  try {
    client.write(`event: visual\ndata: ${JSON.stringify(spec)}\n\n`);
    console.log('[visual] pushed', spec.type, 'to', sid);
    res.json({ status: 'pushed' });
  } catch (err) {
    console.error('[visual] push failed', err);
    clients.delete(sid);
    res.status(500).json({ error: 'push failed' });
  }
});
