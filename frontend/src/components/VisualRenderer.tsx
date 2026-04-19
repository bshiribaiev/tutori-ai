import { MermaidRenderer } from './renderers/MermaidRenderer';
import { DesmosRenderer } from './renderers/DesmosRenderer';
import { SvgRenderer } from './renderers/SvgRenderer';
import type { VisualSpec } from '../lib/visualSpec';

type Props = { spec: VisualSpec | null };

export function VisualRenderer({ spec }: Props) {
  if (!spec) {
    return (
      <div className="aspect-video rounded-3xl border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center px-8">
        <div className="text-[10px] uppercase tracking-[0.3em] text-sky-300/70 font-medium mb-2">
          Live visuals
        </div>
        <div className="text-sm text-neutral-500">
          When your tutor explains something visual, it appears here in sync.
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col animate-fade-in">
      {spec.title && (
        <div className="px-5 pt-4 pb-2 border-b border-white/5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-sky-300/70 font-medium">
            {spec.title}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 p-4 overflow-auto flex items-center justify-center">
        {spec.type === 'mermaid' && <MermaidRenderer code={spec.code} />}
        {spec.type === 'desmos' && <DesmosRenderer expressions={spec.expressions} />}
        {spec.type === 'svg' && <SvgRenderer html={spec.html} />}
      </div>
    </div>
  );
}
