import { Conversation } from '@elevenlabs/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VisualSpec } from './visualSpec';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

type TurnEvent = { role: 'user' | 'agent'; text: string };

type Options = {
  role?: AgentRole;
  voiceIdOverride?: string;
  visualSessionId?: string;
  onTurn?: (event: TurnEvent) => void;
  onModeChange?: (mode: 'speaking' | 'listening') => void;
  onRenderVisual?: (spec: VisualSpec) => void;
};

function coerceVisualSpec(params: Record<string, unknown>): VisualSpec | null {
  const type = params.type;
  const title = typeof params.title === 'string' ? params.title : undefined;
  if (type === 'mermaid' && typeof params.code === 'string') {
    return { type: 'mermaid', code: params.code, title };
  }
  if (type === 'desmos') {
    const raw = params.expressions;
    const expressions = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === 'string')
      : typeof raw === 'string'
        ? [raw]
        : [];
    if (expressions.length) return { type: 'desmos', expressions, title };
  }
  if (type === 'svg' && typeof params.html === 'string') {
    return { type: 'svg', html: params.html, title };
  }
  if (type === 'html' && typeof params.html === 'string') {
    return { type: 'html', html: params.html, title };
  }
  return null;
}

export type ELDirectStatus = 'idle' | 'connecting' | 'live' | 'error';

type AgentRole = 'student' | 'tutor' | 'tutor-alex';

async function fetchAgentId(role: AgentRole): Promise<string> {
  const res = await fetch(`${API_BASE}/api/config`);
  const json = await res.json();
  const id =
    role === 'student'
      ? json.elevenlabs_agent_id_student
      : role === 'tutor-alex'
        ? json.elevenlabs_agent_id_tutor_alex
        : json.elevenlabs_agent_id;
  if (!id) throw new Error(`${role} agent not configured`);
  return id;
}

/**
 * Direct ElevenLabs Agent connection from the browser — no HeyGen involved.
 * Used by Teach mode so the kid character can respond without burning LiveAvatar credits.
 */
export function useELDirect({ role = 'student', voiceIdOverride, visualSessionId, onTurn, onModeChange, onRenderVisual }: Options = {}) {
  const [status, setStatus] = useState<ELDirectStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const convoRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);

  const onTurnRef = useRef(onTurn);
  const onModeRef = useRef(onModeChange);
  const onVisualRef = useRef(onRenderVisual);
  useEffect(() => { onTurnRef.current = onTurn; }, [onTurn]);
  useEffect(() => { onModeRef.current = onModeChange; }, [onModeChange]);
  useEffect(() => { onVisualRef.current = onRenderVisual; }, [onRenderVisual]);

  const start = useCallback(async () => {
    if (convoRef.current) return;

    // Unlock autoplay synchronously within the click gesture. The EL SDK
    // creates its AudioContext later (after async awaits), by which point the
    // gesture may have expired, leaving the context suspended and audio
    // queued silently. Priming a context + resuming here persists audio
    // permission for this origin for the rest of the session.
    try {
      const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const primer = new Ctx();
        if (primer.state === 'suspended') await primer.resume();
        // Play 1 silent sample to fully unlock on Safari/mobile.
        const buf = primer.createBuffer(1, 1, 22050);
        const src = primer.createBufferSource();
        src.buffer = buf;
        src.connect(primer.destination);
        src.start(0);
      }
    } catch { /* ignore */ }

    setStatus('connecting');
    setError(null);
    const t0 = performance.now();
    const ms = () => Math.round(performance.now() - t0);
    try {
      const agentId = await fetchAgentId(role);
      console.log(`[EL ${ms()}ms] startSession`, { role, agentId });
      const convo = await Conversation.startSession({
        agentId,
        connectionType: 'websocket',
        ...(voiceIdOverride ? { overrides: { tts: { voiceId: voiceIdOverride } } } : {}),
        ...(visualSessionId ? { dynamicVariables: { visual_session_id: visualSessionId } } : {}),
        clientTools: {
          render_visual: async (params: Record<string, unknown>) => {
            console.log(`[EL ${ms()}ms] render_visual called`, params?.type);
            const spec = coerceVisualSpec(params);
            if (spec) {
              onVisualRef.current?.(spec);
              return 'rendered';
            }
            return 'invalid spec';
          },
        },
        onConnect: () => {
          console.log(`[EL ${ms()}ms] onConnect`);
          setStatus('live');
        },
        onAudio: (b64: string) => {
          console.log(`[EL ${ms()}ms] onAudio chunk bytes=${b64?.length ?? 0}`);
        },
        onDisconnect: () => {
          console.log(`[EL ${ms()}ms] onDisconnect`);
          setStatus('idle');
          setIsSpeaking(false);
          setIsListening(false);
          convoRef.current = null;
        },
        onError: (msg: string) => {
          console.log(`[EL ${ms()}ms] onError`, msg);
          setStatus('error');
          setError(msg);
        },
        onMessage: ({ message, source }: { message: string; source: 'ai' | 'user' }) => {
          console.log(`[EL ${ms()}ms] onMessage [${source}]`, message?.slice(0, 80));
          if (!message) return;
          onTurnRef.current?.({ role: source === 'user' ? 'user' : 'agent', text: message });
        },
        onModeChange: ({ mode }: { mode: 'speaking' | 'listening' }) => {
          console.log(`[EL ${ms()}ms] onModeChange`, mode);
          setIsSpeaking(mode === 'speaking');
          setIsListening(mode === 'listening');
          onModeRef.current?.(mode);
        },
      });
      console.log(`[EL ${ms()}ms] startSession resolved`);

      // The SDK routes audio through a hidden <audio> element (for setSinkId
      // support) and sets autoplay=true. Chrome's autoplay policy treats
      // autoplay as a *hint* — an element created after several awaits in a
      // promise chain may still be gated, holding audio buffered until a
      // gesture. Explicitly call play() on any hidden audio element the SDK
      // just appended. This accounts for the ~30s "audio stall" we saw.
      const audios = document.querySelectorAll<HTMLAudioElement>('audio');
      audios.forEach((el) => {
        const p = el.play();
        if (p && typeof p.catch === 'function') {
          p.then(() => console.log(`[EL ${ms()}ms] audio.play() OK`, el))
           .catch((err) => console.warn(`[EL ${ms()}ms] audio.play() blocked`, err?.name, err?.message));
        }

        // Chrome quirk: the SDK's hidden <audio> backed by a MediaStream
        // srcObject sometimes silently drops audio even when play() resolves.
        // Build a parallel path: create our own AudioContext, pipe the same
        // MediaStream to its destination. If the <audio> path is broken, this
        // one still delivers audio to the speakers.
        try {
          const stream = el.srcObject as MediaStream | null;
          if (stream && stream.getAudioTracks().length > 0) {
            const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
              ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (Ctx) {
              const parallel = new Ctx();
              if (parallel.state === 'suspended') parallel.resume();
              const src = parallel.createMediaStreamSource(stream);
              src.connect(parallel.destination);
              console.log(`[EL ${ms()}ms] parallel audio path wired (ctx.state=${parallel.state}, rate=${parallel.sampleRate})`);
              (convo as unknown as { _parallelCtx?: AudioContext })._parallelCtx = parallel;
            }
          } else {
            console.log(`[EL ${ms()}ms] no MediaStream on <audio> yet — cannot wire parallel path`);
          }
        } catch (err) {
          console.warn(`[EL ${ms()}ms] parallel audio path failed`, err);
        }
      });

      // Poll the worklet's output volume; log the first non-zero sample so we
      // know when actual audible samples begin. If this fires at ~1s but user
      // hears nothing until ~30s, the issue is downstream (audio element /
      // speakers). If it fires at ~30s, worklet itself is stalling (either
      // buffers hold silence or real samples arrive late).
      let firstVol = false;
      let volFrames = 0;
      const pollStart = ms();
      let rafId = 0;
      const pollVolume = () => {
        const getVol = (convo as unknown as { getOutputVolume?: () => number }).getOutputVolume;
        if (getVol) {
          const v = getVol.call(convo);
          volFrames++;
          if (!firstVol && v > 0.001) {
            firstVol = true;
            console.log(`[EL ${ms()}ms] FIRST WORKLET OUTPUT VOLUME (v=${v.toFixed(4)}, after ${volFrames} frames, pollStartedAt=${pollStart}ms)`);
          }
        }
        rafId = requestAnimationFrame(pollVolume);
      };
      rafId = requestAnimationFrame(pollVolume);
      // Stop the poll when the convo ends.
      const origEndSession = (convo as unknown as { endSession?: () => Promise<void> }).endSession;
      if (origEndSession) {
        (convo as unknown as { endSession: () => Promise<void> }).endSession = async () => {
          cancelAnimationFrame(rafId);
          return origEndSession.call(convo);
        };
      }
      convoRef.current = convo;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
      convoRef.current = null;
    }
  }, []);

  const stop = useCallback(async () => {
    const parallel = (convoRef.current as unknown as { _parallelCtx?: AudioContext } | null)?._parallelCtx;
    await convoRef.current?.endSession();
    convoRef.current = null;
    if (parallel && parallel.state !== 'closed') await parallel.close().catch(() => {});
    setStatus('idle');
    setIsSpeaking(false);
    setIsListening(false);
  }, []);

  useEffect(() => {
    const cleanup = () => {
      convoRef.current?.endSession().catch(() => {});
    };
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('pagehide', cleanup);
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []);

  return { status, error, isSpeaking, isListening, start, stop };
}
