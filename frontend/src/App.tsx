import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AvatarStage, type AvatarStageHandle } from './components/AvatarStage';
import { TeachStage } from './components/TeachStage';
import { LearnPreviewStage } from './components/LearnPreviewStage';
import { TutorPicker, type TutorKey } from './components/TutorPicker';
import { MicButton } from './components/MicButton';
import { TranscriptDrawer } from './components/TranscriptDrawer';
import { AmbientParticles } from './components/AmbientParticles';
import { TextInput } from './components/TextInput';
import { VisualRenderer } from './components/VisualRenderer';
import { MockControls } from './components/MockControls';
import type { VisualSpec } from './lib/visualSpec';
import { IS_MOCK } from './lib/mockMode';
import type { AppMode } from './lib/heygen';
import { AvatarPicker } from './components/AvatarPicker';
import { FeedbackModal } from './components/FeedbackModal';

const IS_PICKER =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('picker');

const TUTOR_PREVIEWS: Record<Exclude<TutorKey, 'alex'>, string> = {
  math: 'https://files2.heygen.ai/avatar/v3/75e0a87b7fd94f0981ff398b593dd47f_45570/preview_talk_4.webp',
  history: 'https://files2.heygen.ai/avatar/v3/db2fb7fd0d044b908395a011166ab22d_45680/preview_target.webp',
  interview: 'https://files2.heygen.ai/avatar/v3/b1ff5edbf96242e6ac9469227df40924_55360/preview_target.webp',
  english: 'https://files2.heygen.ai/avatar/v3/2146e2c8c07045c0b3598683d4473fdd_55340/preview_target.webp',
};

export type TranscriptEntry = {
  role: 'user' | 'agent';
  text: string;
  sources?: { title: string; url: string }[];
};

export default function App() {
  if (IS_PICKER) return <AvatarPicker />;
  return <TutoriAI />;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

function TutoriAI() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [avatarLive, setAvatarLive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [visual, setVisual] = useState<VisualSpec | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [mockLive, setMockLive] = useState(false);
  const [mode, setMode] = useState<AppMode>('learn');
  const [selectedTutor, setSelectedTutor] = useState<TutorKey | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const stageRef = useRef<AvatarStageHandle | null>(null);

  // Per-session routing key for the server-tool visual webhook → SSE bridge.
  const visualSessionId = useMemo(
    () => (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)),
    [],
  );

  // Subscribe to backend SSE. Backend pushes visual specs here when the agent
  // calls render_visual (webhook → our /api/visual/push → this stream).
  useEffect(() => {
    if (mode !== 'learn') return;
    const url = `${API_BASE}/api/visual/stream?sid=${encodeURIComponent(visualSessionId)}`;
    const es = new EventSource(url);
    es.addEventListener('visual', (e) => {
      try {
        const spec = JSON.parse((e as MessageEvent).data) as VisualSpec;
        console.log('[tutoriai] visual ←', spec.type, spec.title ?? '');
        setVisual(spec);
      } catch (err) {
        console.warn('[tutoriai] bad visual payload', err);
      }
    });
    es.onerror = (err) => console.warn('[tutoriai] SSE error', err);
    return () => es.close();
  }, [mode, visualSessionId]);

  const appendTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const handleRenderVisual = useCallback((spec: VisualSpec) => {
    if (mode !== 'learn') return;
    console.log('[tutoriai] client render_visual →', spec.type, spec.title ?? '');
    setVisual(spec);
  }, [mode]);

  const sendFromUser = useCallback(
    (text: string) => {
      if (!stageRef.current?.live && !mockLive) return;
      appendTranscript({ role: 'user', text });
      stageRef.current?.sendMessage(text);
    },
    [appendTranscript, mockLive],
  );

  const endSession = useCallback(() => {
    const wasTeaching = mode === 'teach';
    if (IS_MOCK) {
      setMockLive(false);
      setAvatarLive(false);
    } else {
      stageRef.current?.stop();
    }
    setVisual(null);
    // Only open feedback for Teach mode and when there's actual teaching content.
    if (wasTeaching && transcript.filter((t) => t.role === 'user').length > 0) {
      setFeedbackOpen(true);
    }
  }, [mode, transcript]);

  const effectiveLive = IS_MOCK ? mockLive : avatarLive;

  return (
    <div className="min-h-screen w-full bg-field relative overflow-hidden">
      <AmbientParticles intensity={effectiveLive ? 1.4 : 1} />

      <header className="relative z-10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={
              'w-2.5 h-2.5 rounded-full transition-all ' +
              (effectiveLive
                ? 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]'
                : 'bg-neutral-600')
            }
          />
          <span className="text-2xl font-bold tracking-tight text-neutral-100">TutoriAI</span>
        </div>

        <ModeTabs
          mode={mode}
          onChange={(m) => {
            setMode(m);
            setSelectedTutor(null);
            setVisual(null);
            setTranscript([]);
          }}
          disabled={effectiveLive}
        />

        <button
          onClick={() => setTranscriptOpen(true)}
          className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-100 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Transcript
          {transcript.length > 0 && (
            <span className="text-[10px] tabular-nums bg-sky-400/20 text-sky-200 px-1.5 py-0.5 rounded-full">
              {transcript.length}
            </span>
          )}
        </button>
      </header>

      {!effectiveLive && (
        <div className="relative z-10 max-w-7xl mx-auto px-8 pt-8 pb-4 text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-sky-300/70 font-medium mb-2">
            {mode === 'learn' ? 'Elevating learning accessibility' : 'The Feynman technique'}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-neutral-100 tracking-tight leading-tight">
            {mode === 'learn' ? (
              <>
                A personal tutor,{' '}
                <span className="bg-gradient-to-br from-sky-300 to-amber-200 bg-clip-text text-transparent">
                  just for you.
                </span>
              </>
            ) : (
              <>
                Teach a curious kid.{' '}
                <span className="bg-gradient-to-br from-amber-200 to-pink-300 bg-clip-text text-transparent">
                  Learn twice as deep.
                </span>
              </>
            )}
          </h1>
        </div>
      )}

      <main
        className={
          'relative z-10 mx-auto px-6 pb-32 space-y-4 transition-all duration-700 ease-out ' +
          (effectiveLive ? 'max-w-[1600px] pt-16' : 'max-w-7xl pt-4')
        }
      >
        <div className="flex gap-6 items-stretch justify-center">
          <div
            className={
              'transition-all duration-700 ease-out flex-shrink-0 ' +
              (effectiveLive && mode === 'learn' ? 'w-1/2 max-w-none' : 'w-full max-w-4xl')
            }
          >
            {mode === 'learn' && !selectedTutor && (
              <TutorPicker onPick={setSelectedTutor} />
            )}
            {mode === 'learn' && selectedTutor === 'alex' && (
              <LearnPreviewStage
                ref={stageRef}
                onStatusChange={setAvatarLive}
                onSpeakingChange={setSpeaking}
                onListeningChange={setListening}
                onTurn={appendTranscript}
                onRenderVisual={handleRenderVisual}
                visualSessionId={visualSessionId}
                mockLive={mockLive}
              />
            )}
            {mode === 'learn' && selectedTutor && selectedTutor !== 'alex' && (
              <AvatarStage
                key={selectedTutor}
                ref={stageRef}
                onStatusChange={setAvatarLive}
                onSpeakingChange={setSpeaking}
                onListeningChange={setListening}
                onTurn={appendTranscript}
                listening={listening}
                mockLive={mockLive}
                mode={mode}
                tutor={selectedTutor}
                previewUrl={TUTOR_PREVIEWS[selectedTutor]}
                visualSessionId={visualSessionId}
              />
            )}
            {mode === 'teach' && (
              <TeachStage
                ref={stageRef}
                onStatusChange={setAvatarLive}
                onSpeakingChange={setSpeaking}
                onListeningChange={setListening}
                onTurn={appendTranscript}
                mockLive={mockLive}
              />
            )}
            {mode === 'learn' && selectedTutor && !effectiveLive && (
              <div className="flex justify-center mt-5">
                <button
                  onClick={() => setSelectedTutor(null)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 hover:border-sky-300/50 bg-white/[0.04] hover:bg-white/[0.08] text-sm text-neutral-200 font-medium transition-all"
                >
                  ← Choose another tutor
                </button>
              </div>
            )}
          </div>

          <div
            className={
              'transition-all duration-700 ease-out overflow-hidden ' +
              (effectiveLive && mode === 'learn' ? 'w-1/2 opacity-100' : 'w-0 opacity-0')
            }
          >
            <VisualRenderer spec={visual} />
          </div>
        </div>

        {/* Controls: only when live */}
        <div
          className={
            'transition-all duration-500 ease-out max-w-2xl mx-auto ' +
            (effectiveLive ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none')
          }
        >
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <TextInput disabled={!effectiveLive} onSend={sendFromUser} />
            <MicButton
              avatarLive={effectiveLive}
              speaking={speaking}
              onInterrupt={() => stageRef.current?.interrupt()}
            />
          </div>
        </div>
      </main>

      {/* Bottom-center End session bar */}
      <div
        className={
          'fixed bottom-6 left-0 right-0 z-30 flex justify-center pointer-events-none transition-all duration-500 ' +
          (effectiveLive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')
        }
      >
        <button
          onClick={endSession}
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-400 text-white text-sm font-semibold shadow-[0_8px_30px_-4px_rgba(239,68,68,0.6)] transition-all hover:scale-105"
        >
          <span className="w-2 h-2 rounded-sm bg-white" />
          End session
        </button>
      </div>

      <TranscriptDrawer
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        entries={transcript}
      />

      <FeedbackModal
        open={feedbackOpen}
        transcript={transcript}
        onClose={() => setFeedbackOpen(false)}
      />

      {IS_MOCK && (
        <MockControls
          mode={mode}
          live={mockLive}
          onStartFakeSession={() => { setMockLive(true); setAvatarLive(true); }}
          onEndFakeSession={endSession}
          onUserTurn={appendTranscript}
          onAgentTurn={appendTranscript}
        />
      )}
    </div>
  );
}

function ModeTabs({ mode, onChange, disabled }: { mode: AppMode; onChange: (m: AppMode) => void; disabled?: boolean }) {
  const tabs: { key: AppMode; label: string; sub: string }[] = [
    { key: 'learn', label: 'Learn', sub: 'tutor teaches you' },
    { key: 'teach', label: 'Teach', sub: 'you teach a kid' },
  ];
  return (
    <div className="flex items-center gap-1 p-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm">
      {tabs.map((t) => {
        const active = mode === t.key;
        return (
          <button
            key={t.key}
            disabled={disabled}
            onClick={() => onChange(t.key)}
            title={disabled ? 'End session to switch modes' : t.sub}
            className={
              'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ' +
              (active
                ? (t.key === 'learn' ? 'bg-sky-400 text-neutral-950' : 'bg-amber-300 text-neutral-950')
                : 'text-neutral-400 hover:text-neutral-100') +
              (disabled && !active ? ' opacity-30 cursor-not-allowed' : '')
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
