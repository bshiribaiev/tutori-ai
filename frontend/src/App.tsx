import { useCallback, useRef, useState } from 'react';
import { AvatarStage, type AvatarStageHandle } from './components/AvatarStage';
import { MicButton } from './components/MicButton';
import { TranscriptPanel } from './components/TranscriptPanel';
import { SuggestedPrompts } from './components/SuggestedPrompts';

export type TranscriptEntry = {
  role: 'user' | 'agent';
  text: string;
  sources?: { title: string; url: string }[];
};

export default function App() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [avatarLive, setAvatarLive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const stageRef = useRef<AvatarStageHandle | null>(null);

  const appendTranscript = useCallback(
    (entry: TranscriptEntry) => setTranscript((prev) => [...prev, entry]),
    [],
  );

  return (
    <div className="min-h-screen w-full bg-field relative overflow-hidden">
      <header className="relative z-10 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={
            'w-2 h-2 rounded-full ' +
            (avatarLive ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'bg-neutral-600')
          } />
          <span className="text-sm font-medium tracking-wide text-neutral-200">Tutor</span>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs text-neutral-500">{avatarLive ? 'live' : 'idle'}</span>
        </div>
        <div className="text-xs text-neutral-500 tracking-wider uppercase">
          Hack Brooklyn · Education
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pb-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <section className="flex flex-col items-center justify-start gap-8 pt-4">
          <AvatarStage
            ref={stageRef}
            onStatusChange={setAvatarLive}
            onSpeakingChange={setSpeaking}
            onListeningChange={setListening}
            onTurn={appendTranscript}
            listening={listening}
          />
          <SuggestedPrompts
            disabled={!avatarLive}
            onPick={(q) => appendTranscript({ role: 'user', text: q })}
          />
        </section>

        <aside className="flex flex-col gap-4 pt-4">
          <div className="glass rounded-2xl flex-1 flex flex-col min-h-[420px]">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5">
              <div className="text-xs uppercase tracking-widest text-neutral-500">Transcript</div>
              <div className="text-[10px] text-neutral-600">
                {transcript.length} turns
              </div>
            </div>
            <TranscriptPanel entries={transcript} />
          </div>

          <MicButton
            avatarLive={avatarLive}
            speaking={speaking}
            onInterrupt={() => stageRef.current?.interrupt()}
          />
        </aside>
      </main>
    </div>
  );
}
