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
// HeyGen's dynamic-variable forwarding is flaky, so if the sid is missing or
// doesn't match, broadcast to every currently-open SSE client. For a
// hackathon with one user at a time that routes correctly anyway.
visualRouter.post('/push', (req, res) => {
  const body = req.body ?? {};
  const sid: string | undefined = body.visual_session_id;
  const { visual_session_id: _drop, ...spec } = body;
  void _drop;

  const payload = `event: visual\ndata: ${JSON.stringify(spec)}\n\n`;

  const target = sid ? clients.get(sid) : undefined;
  if (target) {
    try {
      target.write(payload);
      console.log('[visual] pushed', spec.type, 'to', sid);
      return res.json({ status: 'pushed', target: 'sid' });
    } catch (err) {
      console.error('[visual] push failed', err);
      clients.delete(sid!);
      // fall through to broadcast
    }
  }

  if (clients.size === 0) {
    console.warn('[visual] no SSE clients at all; dropping', { sid, known: [...clients.keys()] });
    return res.json({ status: 'no_client' });
  }

  let count = 0;
  for (const [key, res2] of clients) {
    try { res2.write(payload); count++; }
    catch (err) { console.error('[visual] broadcast write failed', key, err); clients.delete(key); }
  }
  console.log('[visual] broadcast', spec.type, 'to', count, 'clients (sid was', sid ?? 'missing', ')');
  res.json({ status: 'broadcast', count });
});
