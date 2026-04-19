import { useEffect, useRef, useState } from 'react';

// Public demo API key — rate-limited but fine for hackathon demo.
const DESMOS_API_KEY = 'dcb31709b452b1cf9dc26972add0fda6';
const DESMOS_SRC = `https://www.desmos.com/api/v1.8/calculator.js?apiKey=${DESMOS_API_KEY}`;

let scriptPromise: Promise<void> | null = null;
function loadDesmos(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).Desmos) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = DESMOS_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Desmos script failed to load'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

type Props = { expressions: string[] };

export function DesmosRenderer({ expressions }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calcRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadDesmos()
      .then(() => {
        if (cancelled || !ref.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Desmos = (window as any).Desmos;
        calcRef.current = Desmos.GraphingCalculator(ref.current, {
          expressions: false,
          settingsMenu: false,
          zoomButtons: true,
          lockViewport: false,
          border: false,
          showGrid: true,
          invertedColors: true,
        });
        expressions.forEach((latex, i) => {
          calcRef.current.setExpression({ id: `e${i}`, latex });
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      if (calcRef.current?.destroy) {
        try {
          calcRef.current.destroy();
        } catch {
          // ignore
        }
      }
      calcRef.current = null;
    };
  }, [expressions]);

  if (error) {
    return <div className="text-xs text-red-400/80 font-mono">desmos error: {error}</div>;
  }
  return <div ref={ref} className="w-full h-full min-h-[320px] rounded-xl overflow-hidden" />;
}
