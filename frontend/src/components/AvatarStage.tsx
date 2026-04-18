import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useHeyGenAvatar, type AvatarStatus, type AvatarTurnEvent } from '../lib/heygen';

type Props = {
  onStatusChange?: (live: boolean) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
  onTurn?: (event: AvatarTurnEvent) => void;
  listening?: boolean;
};

export type AvatarStageHandle = {
  interrupt: () => void;
  stop: () => void;
  sendMessage: (text: string) => void;
  live: boolean;
};

// CREDIT GUARD: never auto-start. Each Start click burns free-tier minutes.
// LiveAvatar caps a single session at ~2 min anyway; idle-kill is a safety net.
const IDLE_AUTO_DISCONNECT_MS = 90_000;

export const AvatarStage = forwardRef<AvatarStageHandle, Props>(function AvatarStage(
  { onStatusChange, onSpeakingChange, onListeningChange, onTurn, listening },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { status, error, isSpeaking, connect, stop, interrupt, sendMessage } = useHeyGenAvatar(videoRef, {
    onTurn,
    onListeningChange,
  });
  const [elapsed, setElapsed] = useState(0);
  const live = status === 'live';

  useImperativeHandle(
    ref,
    () => ({ interrupt, stop, sendMessage, live }),
    [interrupt, stop, sendMessage, live],
  );

  useEffect(() => {
    onStatusChange?.(status === 'live');
  }, [status, onStatusChange]);

  useEffect(() => {
    onSpeakingChange?.(isSpeaking);
  }, [isSpeaking, onSpeakingChange]);

  useEffect(() => {
    if (status !== 'live') {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== 'live') return;
    const id = setTimeout(() => stop(), IDLE_AUTO_DISCONNECT_MS);
    return () => clearTimeout(id);
  }, [status, stop]);

  return (
    <div className="relative w-full">
      <div
        className={
          'absolute -inset-10 rounded-[48px] halo transition-opacity ' +
          (isSpeaking
            ? 'bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.5),transparent_60%)]'
            : listening
              ? 'bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.35),transparent_60%)]'
              : 'bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.3),transparent_60%)]')
        }
      />
      <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] bg-neutral-950">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover"
          onClick={(e) => {
            const v = e.currentTarget;
            if (v.paused) v.play().catch(() => {});
            if (v.muted) v.muted = false;
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {status === 'idle' && <IdleStartButton onStart={connect} />}
          {status === 'connecting' && <Overlay text="Connecting stream…" pulse />}
          {status === 'error' && <Overlay text={error ?? 'Stream error'} tone="error" />}
        </div>

        <StatusPill status={status} />

        {status === 'live' && (
          <>
            <SessionTimer seconds={elapsed} />
            <button
              onClick={() => stop()}
              className="absolute bottom-4 right-4 text-[11px] px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 backdrop-blur-sm pointer-events-auto"
            >
              end session
            </button>
          </>
        )}
      </div>
    </div>
  );
});

function IdleStartButton({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 pointer-events-auto">
      <button
        onClick={onStart}
        className="px-6 py-3 rounded-full bg-sky-400 hover:bg-sky-300 text-neutral-950 font-semibold text-sm shadow-[0_0_32px_rgba(125,211,252,0.5)] transition-transform hover:scale-105"
      >
        ▶ Start session
      </button>
      <div className="text-[10px] text-amber-300/80 font-medium tracking-wide">
        consumes free-tier credits
      </div>
    </div>
  );
}

function SessionTimer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const overBudget = seconds > 60;
  return (
    <div className={
      'absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border font-mono text-[11px] tabular-nums ' +
      (overBudget ? 'border-amber-500/50 text-amber-300' : 'border-white/10 text-neutral-300')
    }>
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

function Overlay({ text, pulse, tone }: { text: string; pulse?: boolean; tone?: 'error' }) {
  return (
    <div
      className={
        'inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-black/40 backdrop-blur-sm ' +
        (tone === 'error' ? 'border-red-500/40 text-red-300' : 'border-white/10 text-neutral-300') +
        (pulse ? ' animate-pulse' : '')
      }
    >
      <div className={'w-1.5 h-1.5 rounded-full ' + (tone === 'error' ? 'bg-red-400' : 'bg-neutral-500')} />
      <span className="text-xs font-medium tracking-wide">{text}</span>
    </div>
  );
}

function StatusPill({ status }: { status: AvatarStatus }) {
  const palette: Record<AvatarStatus, { dot: string; label: string; text: string }> = {
    idle:       { dot: 'bg-neutral-600',  label: 'idle',       text: 'text-neutral-400' },
    connecting: { dot: 'bg-amber-400 animate-pulse', label: 'connecting', text: 'text-amber-300' },
    live:       { dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', label: 'live', text: 'text-emerald-300' },
    error:      { dot: 'bg-red-500',      label: 'error',      text: 'text-red-300'     },
  };
  const p = palette[status];
  return (
    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
      <div className={'w-1.5 h-1.5 rounded-full ' + p.dot} />
      <span className={'text-[10px] uppercase tracking-widest font-medium ' + p.text}>{p.label}</span>
    </div>
  );
}
