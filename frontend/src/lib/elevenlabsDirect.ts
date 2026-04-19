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
    setStatus('connecting');
    setError(null);
    const t0 = performance.now();
    const ms = () => Math.round(performance.now() - t0);
    try {
      const agentId = await fetchAgentId(role);
      console.log(`[EL ${ms()}ms] startSession`, { role, agentId });
      const convo = await Conversation.startSession({
        agentId,
        connectionType: 'webrtc',
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
      convoRef.current = convo;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
      convoRef.current = null;
    }
  }, []);

  const stop = useCallback(async () => {
    await convoRef.current?.endSession();
    convoRef.current = null;
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
