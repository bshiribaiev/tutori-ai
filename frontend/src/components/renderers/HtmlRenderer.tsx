import { useMemo } from 'react';

// Inline agent-authored HTML rendered inside a sandboxed iframe with a consistent
// dark-theme base. Gives the LLM way more layout freedom than bare SVG.
const BASE_CSS = `
  :root {
    color-scheme: dark;
    --bg: #0b1220;
    --panel: #111a2e;
    --ink: #e2e8f0;
    --ink-dim: #94a3b8;
    --accent: #38bdf8;
    --accent-2: #a78bfa;
    --warm: #fbbf24;
    --ok: #34d399;
    --danger: #f87171;
    --border: rgba(255, 255, 255, 0.1);
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    background: var(--bg);
    color: var(--ink);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    line-height: 1.5;
    overflow: auto;
  }
  body { padding: 24px; }
  h1, h2, h3 { margin: 0 0 12px; font-weight: 600; letter-spacing: -0.01em; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.15rem; color: var(--accent); }
  h3 { font-size: 1rem; color: var(--ink-dim); text-transform: uppercase; letter-spacing: 0.08em; }
  p { margin: 0 0 8px; color: var(--ink); }
  .muted { color: var(--ink-dim); }
  .accent { color: var(--accent); }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px;
  }
  .grid { display: grid; gap: 16px; }
  .row { display: flex; gap: 16px; align-items: center; }
  .center { text-align: center; }
  .chip {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(56,189,248,0.14);
    color: var(--accent);
    font-size: 0.78rem;
    font-weight: 500;
  }
  .arrow {
    font-size: 1.5rem; color: var(--accent);
  }
  svg { max-width: 100%; height: auto; }
`;

type Props = { html: string };

export function HtmlRenderer({ html }: Props) {
  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${html}</body></html>`,
    [html],
  );
  return (
    <iframe
      sandbox="allow-same-origin"
      srcDoc={srcDoc}
      className="w-full h-full border-0 bg-transparent"
      title="visual"
    />
  );
}
