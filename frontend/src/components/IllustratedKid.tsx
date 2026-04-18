// Stylized SVG kid character for Teach mode.
// States: idle (breathing, blinking), listening (head tilt, perk), speaking (mouth animates).

type Props = {
  speaking?: boolean;
  listening?: boolean;
};

export function IllustratedKid({ speaking, listening }: Props) {
  const state = speaking ? 'speaking' : listening ? 'listening' : 'idle';

  return (
    <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] bg-[radial-gradient(ellipse_at_center,#1a2030_0%,#0a0d14_70%)] flex items-center justify-center">
      {/* soft spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(251,191,36,0.12),transparent_60%)] pointer-events-none" />

      <svg viewBox="0 0 300 300" className={'w-[70%] h-[80%] kid-' + state} aria-label="Mila, a curious 8-year-old">
        <defs>
          <radialGradient id="face" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffd7b5" />
            <stop offset="100%" stopColor="#f4b98a" />
          </radialGradient>
          <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5a2b" />
            <stop offset="100%" stopColor="#6b3f1f" />
          </linearGradient>
          <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* shirt / body */}
        <g className="kid-body">
          <path d="M 60 300 Q 60 230 150 225 Q 240 230 240 300 Z" fill="url(#shirt)" />
          <circle cx="110" cy="245" r="4" fill="rgba(255,255,255,0.5)" />
          <circle cx="150" cy="250" r="4" fill="rgba(255,255,255,0.5)" />
          <circle cx="190" cy="245" r="4" fill="rgba(255,255,255,0.5)" />
        </g>

        {/* head */}
        <g className="kid-head">
          {/* hair back */}
          <path d="M 80 120 Q 80 50 150 45 Q 220 50 220 120 L 220 140 Q 210 130 200 130 Q 210 100 150 95 Q 90 100 100 130 Q 90 130 80 140 Z" fill="url(#hair)" />
          {/* face */}
          <circle cx="150" cy="140" r="70" fill="url(#face)" />
          {/* ears */}
          <ellipse cx="80" cy="140" rx="8" ry="14" fill="url(#face)" />
          <ellipse cx="220" cy="140" rx="8" ry="14" fill="url(#face)" />
          {/* hair front tuft */}
          <path d="M 110 85 Q 150 65 190 85 Q 170 75 150 80 Q 130 75 110 85 Z" fill="url(#hair)" />
          {/* cheeks */}
          <circle cx="110" cy="160" r="9" fill="#f5918a" opacity="0.55" />
          <circle cx="190" cy="160" r="9" fill="#f5918a" opacity="0.55" />
          {/* eyebrows */}
          <path d="M 115 115 Q 125 110 135 115" stroke="#5c3a1b" strokeWidth="3" fill="none" strokeLinecap="round" className="kid-brow-l" />
          <path d="M 165 115 Q 175 110 185 115" stroke="#5c3a1b" strokeWidth="3" fill="none" strokeLinecap="round" className="kid-brow-r" />
          {/* eyes */}
          <g className="kid-eyes">
            <ellipse cx="125" cy="140" rx="8" ry="10" fill="#1f2937" />
            <ellipse cx="175" cy="140" rx="8" ry="10" fill="#1f2937" />
            <circle cx="127" cy="137" r="2.5" fill="white" />
            <circle cx="177" cy="137" r="2.5" fill="white" />
          </g>
          {/* mouth */}
          <g className="kid-mouth">
            {state === 'speaking' ? (
              <ellipse cx="150" cy="180" rx="14" ry="9" fill="#5a2a1a" />
            ) : state === 'listening' ? (
              <path d="M 135 182 Q 150 192 165 182" stroke="#5a2a1a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M 138 180 Q 150 188 162 180" stroke="#5a2a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
            )}
          </g>
        </g>

        {/* thought bubble when listening */}
        {state === 'listening' && (
          <g className="kid-thought">
            <circle cx="240" cy="70" r="6" fill="rgba(255,255,255,0.15)" />
            <circle cx="255" cy="55" r="9" fill="rgba(255,255,255,0.2)" />
            <circle cx="275" cy="35" r="14" fill="rgba(255,255,255,0.22)" />
            <text x="275" y="40" textAnchor="middle" fontSize="14" fill="#fbbf24" fontWeight="700">?</text>
          </g>
        )}
      </svg>

      {/* state badge — hidden in idle */}
      {state !== 'idle' && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
          <div className={
            'w-1.5 h-1.5 rounded-full ' +
            (state === 'speaking'
              ? 'bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.9)]'
              : 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]')
          } />
          <span className="text-[10px] uppercase tracking-widest font-medium text-neutral-300">
            Mila · {state}
          </span>
        </div>
      )}
    </div>
  );
}
