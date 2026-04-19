import { Conversation } from '@elevenlabs/client';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

type TurnEvent = { role: 'user' | 'agent'; text: string };

type Options = {
  role?: AgentRole;
  voiceIdOverride?: string;
  visualSessionId?: string;
  onTurn?: (event: TurnEvent) => void;
  onModeChange?: (mode: 'speaking' | 'listening') => void;
};

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
export function useELDirect({ role = 'student', voiceIdOverride, visualSessionId, onTurn, onModeChange }: Options = {}) {
  const [status, setStatus] = useState<ELDirectStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const convoRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);

  const onTurnRef = useRef(onTurn);
  const onModeRef = useRef(onModeChange);
  useEffect(() => { onTurnRef.current = onTurn; }, [onTurn]);
  useEffect(() => { onModeRef.current = onModeChange; }, [onModeChange]);

  const start = useCallback(async () => {
    if (convoRef.current) return;
    setStatus('connecting');
    setError(null);
    try {
      const agentId = await fetchAgentId(role);
      const convo = await Conversation.startSession({
        agentId,
        connectionType: 'websocket',
        ...(voiceIdOverride ? { overrides: { tts: { voiceId: voiceIdOverride } } } : {}),
        ...(visualSessionId ? { dynamicVariables: { visual_session_id: visualSessionId } } : {}),
        onConnect: () => setStatus('live'),
        onDisconnect: () => {
          setStatus('idle');
          setIsSpeaking(false);
          setIsListening(false);
          convoRef.current = null;
        },
        onError: (msg: string) => {
          setStatus('error');
          setError(msg);
        },
        onMessage: ({ message, source }: { message: string; source: 'ai' | 'user' }) => {
          if (!message) return;
          onTurnRef.current?.({ role: source === 'user' ? 'user' : 'agent', text: message });
        },
        onModeChange: ({ mode }: { mode: 'speaking' | 'listening' }) => {
          setIsSpeaking(mode === 'speaking');
          setIsListening(mode === 'listening');
          onModeRef.current?.(mode);
        },
      });
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
