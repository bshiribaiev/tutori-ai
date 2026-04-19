import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { IllustratedCharacter } from './IllustratedCharacter';
import { useELDirect } from '../lib/elevenlabsDirect';
import type { AvatarStageHandle } from './AvatarStage';
import type { VisualSpec } from '../lib/visualSpec';

type Props = {
  onStatusChange?: (live: boolean) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
  onTurn?: (event: { role: 'user' | 'agent'; text: string }) => void;
  onRenderVisual?: (spec: VisualSpec) => void;
  mockLive?: boolean;
};

export const LearnPreviewStage = forwardRef<AvatarStageHandle, Props>(function LearnPreviewStage(
  { onStatusChange, onSpeakingChange, onListeningChange, onTurn, onRenderVisual, mockLive },
  ref,
) {
  const { status, error, isSpeaking, isListening, start, stop } = useELDirect({
    role: 'tutor-alex',
    onTurn,
    onRenderVisual,
    onModeChange: (mode) => {
      onSpeakingChange?.(mode === 'speaking');
      onListeningChange?.(mode === 'listening');
    },
  });

  const live = status === 'live' || Boolean(mockLive);

  useImperativeHandle(ref, () => ({
    interrupt: () => {},
    stop,
    sendMessage: () => {},
    live,
  }), [stop, live]);

  useEffect(() => {
    onStatusChange?.(live);
  }, [live, onStatusChange]);

  if (mockLive) {
    return (
      <div className="relative w-full">
        <IllustratedCharacter role="tutor" speaking={isSpeaking} listening={isListening} />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <IllustratedCharacter role="tutor" speaking={isSpeaking} listening={isListening} />

      {status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            onClick={start}
            className="px-7 py-3.5 rounded-full bg-sky-300 hover:bg-sky-200 text-neutral-950 font-semibold text-sm shadow-[0_10px_40px_-5px_rgba(125,211,252,0.5)] transition-all hover:scale-105 flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
              <polygon points="6,4 20,12 6,20" />
            </svg>
            Start session
          </button>
        </div>
      )}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-sky-300/80 animate-pulse z-10">Connecting…</div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-red-400 z-10">{error ?? 'Connection error'}</div>
      )}
    </div>
  );
});
