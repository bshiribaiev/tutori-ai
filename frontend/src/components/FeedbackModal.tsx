import { useEffect, useState } from 'react';
import { fetchFeedback, type Feedback } from '../lib/feedback';
import type { TranscriptEntry } from '../App';

type Props = {
  open: boolean;
  transcript: TranscriptEntry[];
  onClose: () => void;
};

export function FeedbackModal({ open, transcript, onClose }: Props) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    setError(null);
    if (transcript.length === 0) return;
    setLoading(true);
    fetchFeedback(transcript)
      .then(setFeedback)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [open, transcript]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/10 animate-fade-in">
        <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-300/80">Teaching feedback</div>
            <div className="text-lg font-semibold text-neutral-100">How did you do?</div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200 text-sm" aria-label="close">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto scroll-subtle px-6 py-5">
          {transcript.length === 0 && (
            <div className="text-sm text-neutral-400 text-center py-10">
              No teaching to evaluate — try a session first.
            </div>
          )}
          {loading && <LoadingState />}
          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              {error}
            </div>
          )}
          {feedback && <FeedbackBody fb={feedback} />}
        </div>

        <footer className="px-6 py-3 border-t border-white/5 text-[10px] text-neutral-500 flex items-center justify-between">
          <span>Graded by Gemini with live web verification</span>
          <button onClick={onClose} className="text-neutral-300 hover:text-white">close</button>
        </footer>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-3">
      <div className="w-10 h-10 rounded-full border-2 border-sky-300/30 border-t-sky-300 animate-spin" />
      <div className="text-xs text-neutral-400">Reviewing your explanation and checking facts…</div>
    </div>
  );
}

function FeedbackBody({ fb }: { fb: Feedback }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        <ScoreRing score={fb.overall_score} />
        <p className="text-sm text-neutral-200 leading-relaxed flex-1">{fb.summary}</p>
      </div>

      {fb.correct.length > 0 && (
        <Section title="What you got right" tone="good" count={fb.correct.length}>
          <ul className="space-y-2">
            {fb.correct.map((c, i) => (
              <li key={i} className="text-sm text-neutral-200 flex gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span className="italic text-neutral-300">“{c}”</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {fb.needs_clarification.length > 0 && (
        <Section title="Could use more detail" tone="warn" count={fb.needs_clarification.length}>
          <ul className="space-y-2">
            {fb.needs_clarification.map((c, i) => (
              <li key={i} className="text-sm text-neutral-200 flex gap-2">
                <span className="text-amber-300 mt-0.5">◐</span>
                <span className="italic text-neutral-300">“{c}”</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {fb.incorrect.length > 0 && (
        <Section title="Needs correction" tone="bad" count={fb.incorrect.length}>
          <ul className="space-y-3">
            {fb.incorrect.map((c, i) => (
              <li key={i} className="text-sm space-y-1">
                <div className="flex gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span className="italic text-neutral-300">“{c.claim}”</span>
                </div>
                <div className="ml-5 text-neutral-200">
                  <span className="text-neutral-500">Correction: </span>
                  {c.correction}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {fb.sources.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Sources consulted</div>
          <div className="flex flex-wrap gap-1.5">
            {fb.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-400 hover:text-neutral-100 truncate max-w-[220px]"
              >
                {shortName(s.title)}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, tone, count, children }: { title: string; tone: 'good' | 'warn' | 'bad'; count: number; children: React.ReactNode }) {
  const border = tone === 'good' ? 'border-emerald-400/20' : tone === 'warn' ? 'border-amber-400/20' : 'border-red-400/25';
  const tint = tone === 'good' ? 'bg-emerald-400/[0.04]' : tone === 'warn' ? 'bg-amber-400/[0.04]' : 'bg-red-400/[0.04]';
  return (
    <div className={`rounded-2xl p-4 border ${border} ${tint}`}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-xs uppercase tracking-widest text-neutral-300 font-semibold">{title}</h3>
        <span className="text-[10px] text-neutral-500 tabular-nums">{count}</span>
      </div>
      {children}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 80 ? '#34d399' : clamped >= 55 ? '#fbbf24' : '#f87171';
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg width={80} height={80} viewBox="0 0 80 80" className="-rotate-90">
        <circle cx={40} cy={40} r={28} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" />
        <circle
          cx={40} cy={40} r={28}
          stroke={color} strokeWidth={6} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold tabular-nums" style={{ color }}>{clamped}</span>
      </div>
    </div>
  );
}

function shortName(title: string): string {
  if (/^https?:\/\//.test(title)) {
    try { return new URL(title).hostname.replace(/^www\./, ''); } catch { return title; }
  }
  return title.replace(/\s*-\s*[A-Z].*$/, '').slice(0, 40);
}
