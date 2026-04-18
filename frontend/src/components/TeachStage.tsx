import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { IllustratedKid } from './IllustratedKid';
import { useELDirect } from '../lib/elevenlabsDirect';
import type { AvatarStageHandle } from './AvatarStage';

type Props = {
  onStatusChange?: (live: boolean) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
  onTurn?: (event: { role: 'user' | 'agent'; text: string }) => void;
  mockLive?: boolean;
};

export const TeachStage = forwardRef<AvatarStageHandle, Props>(function TeachStage(
  { onStatusChange, onSpeakingChange, onListeningChange, onTurn, mockLive },
  ref,
) {
  const { status, error, isSpeaking, isListening, start, stop } = useELDirect({
    onTurn,
    onModeChange: (mode) => {
      onSpeakingChange?.(mode === 'speaking');
      onListeningChange?.(mode === 'listening');
    },
  });

  const live = status === 'live' || Boolean(mockLive);
  const speaking = isSpeaking;
  const listening = isListening;

  useEffect(() => {
    onStatusChange?.(live);
  }, [live, onStatusChange]);

  useImperativeHandle(ref, () => ({
    interrupt: () => {},
    stop,
    sendMessage: () => {},
    live,
  }), [stop, live]);

  // Mock mode: bypass real connection entirely.
  if (mockLive) {
    return (
      <div className="relative w-full">
        <IllustratedKid speaking={speaking} listening={listening} />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <IllustratedKid speaking={speaking} listening={listening} />

      {/* idle overlay: Start button */}
      {status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            onClick={start}
            className="px-7 py-3.5 rounded-full bg-amber-300 hover:bg-amber-200 text-neutral-950 font-semibold text-sm shadow-[0_10px_40px_-5px_rgba(251,191,36,0.5)] transition-all hover:scale-105 flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
              <polygon points="6,4 20,12 6,20" />
            </svg>
            Start teaching
          </button>
        </div>
      )}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-amber-300/80 animate-pulse z-10">Connecting to Mila…</div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-red-400 z-10">{error ?? 'Connection error'}</div>
      )}
    </div>
  );
});
