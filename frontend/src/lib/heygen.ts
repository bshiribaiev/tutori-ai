import {
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  AgentEventsEnum,
} from '@heygen/liveavatar-web-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

async function fetchSessionToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/session/start`, { method: 'POST' });
  if (!res.ok) throw new Error(`session/start ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (!json.session_token) throw new Error('no session_token in response');
  return json.session_token;
}

export type AvatarStatus = 'idle' | 'connecting' | 'live' | 'error';

export type AvatarTurnEvent =
  | { role: 'user'; text: string }
  | { role: 'agent'; text: string };

type HookOptions = {
  onTurn?: (event: AvatarTurnEvent) => void;
  onListeningChange?: (listening: boolean) => void;
};

export function useHeyGenAvatar(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  { onTurn, onListeningChange }: HookOptions = {},
) {
  const [status, setStatus] = useState<AvatarStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const sessionRef = useRef<LiveAvatarSession | null>(null);

  const onTurnRef = useRef(onTurn);
  const onListeningRef = useRef(onListeningChange);
  useEffect(() => { onTurnRef.current = onTurn; }, [onTurn]);
  useEffect(() => { onListeningRef.current = onListeningChange; }, [onListeningChange]);

  const connect = useCallback(async () => {
    if (sessionRef.current) return;
    setStatus('connecting');
    setError(null);
    try {
      const sessionToken = await fetchSessionToken();
      // voiceChat:true → mic captured by the LiveAvatar session.
      // HeyGen forwards audio to EL Agent (server-side via secret_id).
      // Agent processes STT+LLM+TTS and pipes audio back to HeyGen for lip-sync.
      const session = new LiveAvatarSession(sessionToken, { voiceChat: true });
      sessionRef.current = session;

      session.on(SessionEvent.SESSION_STATE_CHANGED, (next: SessionState) => {
        if (next === SessionState.CONNECTED) setStatus('live');
        if (next === SessionState.DISCONNECTED) setStatus('idle');
      });
      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        if (videoRef.current) session.attach(videoRef.current);
      });
      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        sessionRef.current = null;
        setStatus('idle');
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => setIsSpeaking(true));
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => setIsSpeaking(false));
      session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => onListeningRef.current?.(true));
      session.on(AgentEventsEnum.USER_SPEAK_ENDED, () => onListeningRef.current?.(false));

      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (e: { text: string }) => {
        if (e.text) onTurnRef.current?.({ role: 'user', text: e.text });
      });
      session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, (e: { text: string }) => {
        if (e.text) onTurnRef.current?.({ role: 'agent', text: e.text });
      });

      await session.start();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
      sessionRef.current = null;
    }
  }, [videoRef]);

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!sessionRef.current) return;
    sessionRef.current.message(text);
  }, []);

  const stop = useCallback(async () => {
    await sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop().catch(() => {});
    };
  }, []);

  return { status, error, isSpeaking, connect, stop, interrupt, sendMessage };
}
