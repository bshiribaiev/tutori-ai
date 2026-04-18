// In LITE + EL Agent mode, the mic is owned by the LiveAvatar session
// (voiceChat: true). This button becomes an interrupt control while the
// avatar is speaking.

type Props = {
  avatarLive: boolean;
  speaking: boolean;
  onInterrupt: () => void;
};

export function MicButton({ avatarLive, speaking, onInterrupt }: Props) {
  const idle = !avatarLive;
  return (
    <button
      disabled={idle || !speaking}
      onClick={onInterrupt}
      className={
        'group relative h-16 rounded-2xl font-medium text-sm tracking-wide transition-all ' +
        (idle
          ? 'bg-neutral-900/60 border border-white/5 text-neutral-600 cursor-not-allowed'
          : speaking
            ? 'bg-sky-400/10 border border-sky-400/40 text-sky-200 hover:bg-sky-400/20'
            : 'bg-white/5 border border-white/10 text-neutral-400')
      }
    >
      <div className="flex items-center justify-center gap-3">
        {speaking ? <WaveSpeaking /> : <MicIcon muted={idle} />}
        <span>
          {idle ? 'Start session above' : speaking ? 'Interrupt' : 'Listening — just talk'}
        </span>
      </div>
    </button>
  );
}

function MicIcon({ muted }: { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={'w-4 h-4 ' + (muted ? 'opacity-50' : '')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function WaveSpeaking() {
  return (
    <div className="flex items-end gap-[3px] h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="wave-bar w-[3px] bg-sky-300 rounded-full h-full"
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );
}
