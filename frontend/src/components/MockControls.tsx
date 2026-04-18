import { MOCK_FLOWS } from '../lib/mockMode';
import type { TranscriptEntry } from '../App';
import type { AppMode } from '../lib/heygen';

type Props = {
  mode: AppMode;
  live: boolean;
  onStartFakeSession: () => void;
  onEndFakeSession: () => void;
  onUserTurn: (entry: TranscriptEntry) => void;
  onAgentTurn: (entry: TranscriptEntry) => void;
};

export function MockControls({ mode, live, onStartFakeSession, onEndFakeSession, onUserTurn, onAgentTurn }: Props) {
  const flows = MOCK_FLOWS[mode];
  const runFlow = (key: string) => {
    const steps = flows[key];
    if (!steps) return;
    let delay = 0;
    for (const step of steps) {
      setTimeout(() => onUserTurn({ role: 'user', text: step.userSays }), delay);
      delay += 400;
      setTimeout(
        () => onAgentTurn({ role: 'agent', text: step.agentSays, sources: step.sources }),
        delay,
      );
      delay += 1600;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 glass rounded-xl p-3 space-y-2 border border-amber-400/30 max-w-xs">
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-widest text-amber-300 font-semibold">Mock · {mode}</span>
        <span className="text-[9px] text-neutral-500">no credits</span>
      </div>
      <div className="flex gap-2">
        {!live ? (
          <button
            onClick={onStartFakeSession}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-200 border border-emerald-400/30"
          >
            ▶ Start
          </button>
        ) : (
          <button
            onClick={onEndFakeSession}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-red-400/20 hover:bg-red-400/30 text-red-200 border border-red-400/30"
          >
            ■ End
          </button>
        )}
      </div>
      {live && (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {Object.keys(flows).map((k) => (
            <button
              key={k}
              onClick={() => runFlow(k)}
              className="text-[11px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 capitalize"
            >
              {k}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
