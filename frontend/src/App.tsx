import { useCallback, useRef, useState } from 'react';
import { AvatarStage, type AvatarStageHandle } from './components/AvatarStage';
import { MicButton } from './components/MicButton';
import { TranscriptPanel } from './components/TranscriptPanel';
import { SuggestedPrompts } from './components/SuggestedPrompts';
import { AmbientParticles } from './components/AmbientParticles';
import { TextInput } from './components/TextInput';
import { VisualCanvas } from './components/VisualCanvas';
import { matchVisual, type Visual } from './lib/visualMatcher';

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
  const [visual, setVisual] = useState<Visual | null>(null);
  const stageRef = useRef<AvatarStageHandle | null>(null);

  const appendTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
    if (entry.role === 'agent') {
      const v = matchVisual(entry.text);
      if (v) setVisual(v);
    }
  }, []);

  const sendFromUser = useCallback(
    (text: string) => {
      if (!stageRef.current?.live) return;
      appendTranscript({ role: 'user', text });
      stageRef.current.sendMessage(text);
    },
    [appendTranscript],
  );

  return (
    <div className="min-h-screen w-full bg-field relative overflow-hidden">
      <AmbientParticles intensity={avatarLive ? 1.4 : 1} />

      <header className="relative z-10 px-8 py-6 flex items-center">
        <div className="flex items-center gap-3">
          <div
            className={
              'w-2 h-2 rounded-full transition-all ' +
              (avatarLive
                ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                : 'bg-neutral-600')
            }
          />
          <span className="text-sm font-semibold tracking-wide text-neutral-100">TutoriAI</span>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs text-neutral-500">{avatarLive ? 'live' : 'idle'}</span>
        </div>
      </header>

      {!avatarLive && transcript.length === 0 && <HeroOverlay />}

      <main className="relative z-10 max-w-7xl mx-auto px-8 pb-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <section className="relative flex flex-col items-center justify-start gap-4 pt-4">
          <AvatarStage
            ref={stageRef}
            onStatusChange={setAvatarLive}
            onSpeakingChange={setSpeaking}
            onListeningChange={setListening}
            onTurn={appendTranscript}
            listening={listening}
          />
          <div className="w-full max-w-3xl">
            <VisualCanvas visual={visual} />
          </div>
          <SuggestedPrompts
            disabled={!avatarLive}
            onPick={sendFromUser}
          />
        </section>

        <aside className="flex flex-col gap-3 pt-4">
          <div className="glass rounded-2xl flex-1 flex flex-col min-h-[460px]">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5">
              <div className="text-xs uppercase tracking-widest text-neutral-500">Transcript</div>
              <div className="text-[10px] text-neutral-600 tabular-nums">
                {transcript.length} turn{transcript.length === 1 ? '' : 's'}
              </div>
            </div>
            <TranscriptPanel entries={transcript} />
          </div>

          <TextInput disabled={!avatarLive} onSend={sendFromUser} />

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

function HeroOverlay() {
  return (
    <div className="relative z-10 max-w-7xl mx-auto px-8 pt-4 pb-6 text-center">
      <div className="text-[10px] uppercase tracking-[0.3em] text-sky-300/70 font-medium mb-2">
        Elevating learning accessibility
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold text-neutral-100 tracking-tight leading-tight">
        A personal tutor,{' '}
        <span className="bg-gradient-to-br from-sky-300 to-amber-200 bg-clip-text text-transparent">
          just for you.
        </span>
      </h1>
    </div>
  );
}
