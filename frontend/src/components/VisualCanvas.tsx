import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Visual } from '../lib/visualMatcher';

type Props = {
  visual: Visual | null;
};

export function VisualCanvas({ visual }: Props) {
  if (!visual) {
    return (
      <div className="relative aspect-video glass rounded-3xl flex items-center justify-center px-8">
        <div className="text-center space-y-1.5 max-w-xs">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Live visuals</div>
          <div className="text-xs text-neutral-500">
            When your tutor explains something visual, it appears here in sync.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={JSON.stringify(visual)} className="relative aspect-video glass rounded-3xl p-6 flex flex-col justify-center items-center animate-fade-in">
      {visual.kind === 'equation' && <EquationView latex={visual.latex} caption={visual.caption} />}
      {visual.kind === 'plot' && <PlotView fn={visual.fn} caption={visual.caption} />}
      {visual.kind === 'callout' && <CalloutView title={visual.title} body={visual.body} illo={visual.illo} />}
      {visual.kind === 'diagram' && <DiagramView name={visual.name} />}
    </div>
  );
}

function EquationView({ latex, caption }: { latex: string; caption?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, { throwOnError: false, displayMode: true });
      } catch {
        if (ref.current) ref.current.textContent = latex;
      }
    }
  }, [latex]);
  return (
    <div className="text-center space-y-3">
      <div ref={ref} className="text-2xl text-sky-100" />
      {caption && <div className="text-xs text-neutral-400">{caption}</div>}
    </div>
  );
}

function PlotView({ fn, caption }: { fn: string; caption?: string }) {
  const width = 320;
  const height = 180;
  const pad = 24;
  const xMin = -6, xMax = 6;
  const yMin = -2, yMax = 4;
  const toPx = (x: number, y: number) => [
    pad + ((x - xMin) / (xMax - xMin)) * (width - 2 * pad),
    height - pad - ((y - yMin) / (yMax - yMin)) * (height - 2 * pad),
  ];
  const f = (x: number) => {
    switch (fn) {
      case 'sin': return Math.sin(x);
      case 'cos': return Math.cos(x);
      case 'parabola': return 0.3 * x * x;
      case 'exponential': return Math.min(4, Math.exp(x * 0.5) - 1);
      case 'line': return 0.5 * x + 0.5;
      default: return 0;
    }
  };
  const pts: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const x = xMin + ((xMax - xMin) * i) / 200;
    const y = f(x);
    if (y < yMin - 0.5 || y > yMax + 0.5) continue;
    const [px, py] = toPx(x, y);
    pts.push(`${pts.length === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  const [x0, y0] = toPx(0, 0);
  return (
    <div className="text-center space-y-3">
      <svg width={width} height={height} className="mx-auto">
        {/* grid */}
        {Array.from({ length: 13 }, (_, i) => {
          const x = xMin + i;
          const [px] = toPx(x, 0);
          return <line key={`v${i}`} x1={px} y1={pad} x2={px} y2={height - pad} stroke="rgba(125,211,252,0.05)" strokeWidth={1} />;
        })}
        {Array.from({ length: 7 }, (_, i) => {
          const y = yMin + i;
          const [, py] = toPx(0, y);
          return <line key={`h${i}`} x1={pad} y1={py} x2={width - pad} y2={py} stroke="rgba(125,211,252,0.05)" strokeWidth={1} />;
        })}
        {/* axes */}
        <line x1={pad} y1={y0} x2={width - pad} y2={y0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
        <line x1={x0} y1={pad} x2={x0} y2={height - pad} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
        {/* curve */}
        <path d={pts.join(' ')} fill="none" stroke="#7dd3fc" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {caption && <div className="text-xs text-neutral-400 font-mono">{caption}</div>}
    </div>
  );
}

function CalloutView({ title, body, illo }: { title: string; body: string; illo?: 'newton1' | 'newton3' | 'entropy' }) {
  return (
    <div className="text-center space-y-3 max-w-sm">
      {illo && <CalloutIllo kind={illo} />}
      <div className="text-[10px] uppercase tracking-widest text-amber-300/80">Key idea</div>
      <div className="text-lg font-semibold text-neutral-100">{title}</div>
      <div className="text-sm text-neutral-300 leading-relaxed">{body}</div>
    </div>
  );
}

function CalloutIllo({ kind }: { kind: 'newton1' | 'newton3' | 'entropy' }) {
  if (kind === 'newton1') {
    // Ball rolling with a constant-velocity arrow, no external forces.
    return (
      <svg width={260} height={80} viewBox="0 0 260 80" className="mx-auto">
        <line x1={20} y1={60} x2={240} y2={60} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="2 3" />
        <circle cx={80} cy={50} r={10} fill="rgba(125,211,252,0.3)" stroke="#7dd3fc" strokeWidth={1.5} />
        <line x1={100} y1={50} x2={180} y2={50} stroke="#7dd3fc" strokeWidth={1.5} markerEnd="url(#arrowCyan)" />
        <text x={140} y={38} fill="#7dd3fc" fontSize={10} textAnchor="middle" fontFamily="ui-monospace">v = constant</text>
        <text x={80} y={80} fill="rgba(255,255,255,0.4)" fontSize={9} textAnchor="middle">no net force</text>
        <defs>
          <marker id="arrowCyan" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#7dd3fc" />
          </marker>
        </defs>
      </svg>
    );
  }
  if (kind === 'newton3') {
    // Two opposite arrows — equal and opposite reaction.
    return (
      <svg width={220} height={80} viewBox="0 0 220 80" className="mx-auto">
        <rect x={90} y={30} width={40} height={30} rx={4} fill="rgba(125,211,252,0.2)" stroke="#7dd3fc" strokeWidth={1.5} />
        <line x1={30} y1={45} x2={85} y2={45} stroke="#7dd3fc" strokeWidth={2} markerEnd="url(#a1)" />
        <line x1={190} y1={45} x2={135} y2={45} stroke="#fbbf24" strokeWidth={2} markerEnd="url(#a2)" />
        <text x={55} y={32} fill="#7dd3fc" fontSize={10} textAnchor="middle">F</text>
        <text x={170} y={32} fill="#fbbf24" fontSize={10} textAnchor="middle">-F</text>
        <defs>
          <marker id="a1" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#7dd3fc" />
          </marker>
          <marker id="a2" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#fbbf24" />
          </marker>
        </defs>
      </svg>
    );
  }
  // entropy: dots going from ordered → disordered
  return (
    <svg width={260} height={70} viewBox="0 0 260 70" className="mx-auto">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={`o${i}`} cx={18 + i * 12} cy={35} r={3} fill="#7dd3fc" />
      ))}
      <path d="M100 35 L140 35" stroke="rgba(255,255,255,0.3)" strokeWidth={1} markerEnd="url(#ae)" />
      {[...Array(12)].map((_, i) => {
        const x = 160 + (i * 7) % 90;
        const y = 15 + ((i * 13) % 45);
        return <circle key={`d${i}`} cx={x} cy={y} r={3} fill="#fbbf24" />;
      })}
      <defs>
        <marker id="ae" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.4)" />
        </marker>
      </defs>
    </svg>
  );
}

function DiagramView({ name }: { name: 'pythagoras' | 'solar_system' | 'photosynthesis' }) {
  if (name === 'pythagoras') {
    return (
      <div className="text-center space-y-3">
        <svg width={220} height={180} viewBox="0 0 220 180" className="mx-auto">
          <polygon points="30,150 190,150 30,30" fill="rgba(125,211,252,0.12)" stroke="#7dd3fc" strokeWidth={2} />
          <text x="100" y="168" fill="#fbbf24" fontSize="13" textAnchor="middle" fontFamily="ui-monospace">a</text>
          <text x="20" y="90" fill="#fbbf24" fontSize="13" textAnchor="middle" fontFamily="ui-monospace">b</text>
          <text x="120" y="80" fill="#f472b6" fontSize="13" textAnchor="middle" fontFamily="ui-monospace" transform="rotate(-32 120 80)">c</text>
          <rect x="30" y="140" width="10" height="10" fill="none" stroke="#7dd3fc" strokeWidth={1} />
        </svg>
        <div className="text-xs text-neutral-400 font-mono">a² + b² = c²</div>
      </div>
    );
  }
  if (name === 'solar_system') {
    return (
      <div className="text-center space-y-3">
        <svg width={260} height={160} viewBox="0 0 260 160" className="mx-auto">
          <circle cx="130" cy="80" r="10" fill="#fbbf24" />
          {[30, 50, 75, 105].map((r, i) => (
            <g key={i}>
              <circle cx="130" cy="80" r={r} fill="none" stroke="rgba(125,211,252,0.2)" strokeWidth={1} />
              <circle cx={130 + r} cy={80} r={3 + i * 0.6} fill="#7dd3fc" />
            </g>
          ))}
        </svg>
        <div className="text-xs text-neutral-400">inner planets (schematic)</div>
      </div>
    );
  }
  // photosynthesis — simple box diagram
  return (
    <div className="text-center space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm">
        <Pill label="CO₂ + H₂O" tone="sky" />
        <span className="text-neutral-500">+</span>
        <Pill label="sunlight" tone="amber" />
        <span className="text-neutral-500">→</span>
        <Pill label="glucose + O₂" tone="emerald" />
      </div>
      <div className="text-xs text-neutral-400">photosynthesis, summarized</div>
    </div>
  );
}

function Pill({ label, tone }: { label: string; tone: 'sky' | 'amber' | 'emerald' }) {
  const cls = {
    sky: 'bg-sky-400/10 border-sky-400/30 text-sky-200',
    amber: 'bg-amber-400/10 border-amber-400/30 text-amber-200',
    emerald: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-200',
  }[tone];
  return <span className={'px-2.5 py-1 rounded-full border text-xs ' + cls}>{label}</span>;
}
