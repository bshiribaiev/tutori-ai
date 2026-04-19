import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let initialized = false;
function initOnce() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    themeVariables: {
      background: 'transparent',
      primaryColor: '#0f172a',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#38bdf8',
      lineColor: '#94a3b8',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
    },
  });
  initialized = true;
}

type Props = { code: string };

export function MermaidRenderer({ code }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initOnce();
    let cancelled = false;
    const id = 'mmd-' + Math.random().toString(36).slice(2, 9);
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="text-xs text-red-400/80 font-mono whitespace-pre-wrap">
        mermaid error: {error}
      </div>
    );
  }
  return <div ref={ref} className="w-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto" />;
}
