// Stylized SVG character for preview/teach modes.
// role='student' = Mila (warm amber, no glasses)
// role='tutor'   = Alex (cool blue, glasses, slightly older look)

type Props = {
  role: 'student' | 'tutor';
  speaking?: boolean;
  listening?: boolean;
};

export function IllustratedCharacter({ role, speaking, listening }: Props) {
  const state = speaking ? 'speaking' : listening ? 'listening' : 'idle';

  const palette = role === 'student'
    ? {
        faceTop: '#ffd7b5', faceBot: '#f4b98a',
        hairTop: '#8b5a2b', hairBot: '#6b3f1f',
        shirtTop: '#fbbf24', shirtBot: '#f59e0b',
        cheek: '#f5918a',
        label: 'Mila',
      }
    : {
        faceTop: '#f0d3b5', faceBot: '#e2b88c',
        hairTop: '#3a3a3a', hairBot: '#1f1f1f',
        shirtTop: '#7dd3fc', shirtBot: '#38bdf8',
        cheek: '#f5a394',
        label: 'Alex',
      };

  const glowTone = role === 'student'
    ? 'bg-[radial-gradient(ellipse_at_50%_30%,rgba(251,191,36,0.12),transparent_60%)]'
    : 'bg-[radial-gradient(ellipse_at_50%_30%,rgba(125,211,252,0.14),transparent_60%)]';

  return (
    <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] bg-[radial-gradient(ellipse_at_center,#1a2030_0%,#0a0d14_70%)] flex items-center justify-center">
      <div className={'absolute inset-0 pointer-events-none ' + glowTone} />

      <svg viewBox="0 0 300 300" className={'w-[70%] h-[80%] kid-' + state} aria-label={palette.label}>
        <defs>
          <radialGradient id={`face-${role}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={palette.faceTop} />
            <stop offset="100%" stopColor={palette.faceBot} />
          </radialGradient>
          <linearGradient id={`hair-${role}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.hairTop} />
            <stop offset="100%" stopColor={palette.hairBot} />
          </linearGradient>
          <linearGradient id={`shirt-${role}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.shirtTop} />
            <stop offset="100%" stopColor={palette.shirtBot} />
          </linearGradient>
        </defs>

        {/* shirt / body */}
        <g className="kid-body">
          <path d="M 60 300 Q 60 230 150 225 Q 240 230 240 300 Z" fill={`url(#shirt-${role})`} />
          {role === 'tutor' && (
            <>
              {/* collar for tutor */}
              <path d="M 120 230 L 150 255 L 180 230" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          <circle cx="110" cy="245" r="3" fill="rgba(255,255,255,0.5)" />
          <circle cx="150" cy="250" r="3" fill="rgba(255,255,255,0.5)" />
          <circle cx="190" cy="245" r="3" fill="rgba(255,255,255,0.5)" />
        </g>

        {/* head */}
        <g className="kid-head">
          {/* hair back */}
          <path d="M 80 120 Q 80 50 150 45 Q 220 50 220 120 L 220 140 Q 210 130 200 130 Q 210 100 150 95 Q 90 100 100 130 Q 90 130 80 140 Z" fill={`url(#hair-${role})`} />
          {/* face */}
          <circle cx="150" cy="140" r="70" fill={`url(#face-${role})`} />
          {/* ears */}
          <ellipse cx="80" cy="140" rx="8" ry="14" fill={`url(#face-${role})`} />
          <ellipse cx="220" cy="140" rx="8" ry="14" fill={`url(#face-${role})`} />
          {/* hair front */}
          {role === 'student' ? (
            <path d="M 110 85 Q 150 65 190 85 Q 170 75 150 80 Q 130 75 110 85 Z" fill={`url(#hair-${role})`} />
          ) : (
            /* tutor: sharper, side-parted */
            <path d="M 95 95 Q 140 70 215 90 Q 200 85 150 85 Q 120 85 95 95 Z" fill={`url(#hair-${role})`} />
          )}
          {/* cheeks */}
          <circle cx="110" cy="160" r="9" fill={palette.cheek} opacity="0.55" />
          <circle cx="190" cy="160" r="9" fill={palette.cheek} opacity="0.55" />
          {/* eyebrows */}
          <path d="M 115 115 Q 125 110 135 115" stroke="#3a2010" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 165 115 Q 175 110 185 115" stroke="#3a2010" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* eyes */}
          <g className="kid-eyes">
            <ellipse cx="125" cy="140" rx="8" ry="10" fill="#1f2937" />
            <ellipse cx="175" cy="140" rx="8" ry="10" fill="#1f2937" />
            <circle cx="127" cy="137" r="2.5" fill="white" />
            <circle cx="177" cy="137" r="2.5" fill="white" />
          </g>
          {/* glasses on tutor */}
          {role === 'tutor' && (
            <g>
              <circle cx="125" cy="140" r="18" fill="none" stroke="rgba(30,30,30,0.9)" strokeWidth="2.5" />
              <circle cx="175" cy="140" r="18" fill="none" stroke="rgba(30,30,30,0.9)" strokeWidth="2.5" />
              <line x1="143" y1="140" x2="157" y2="140" stroke="rgba(30,30,30,0.9)" strokeWidth="2" />
            </g>
          )}
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

        {/* thought bubble only on student listening */}
        {role === 'student' && state === 'listening' && (
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
            {palette.label} · {state}
          </span>
        </div>
      )}

      {/* preview badge for tutor role */}
      {role === 'tutor' && (
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-sky-400/15 border border-sky-400/40 text-[10px] uppercase tracking-widest text-sky-200 font-semibold">
          preview · free
        </div>
      )}
    </div>
  );
}
