export type VisualSpec =
  | { type: 'mermaid'; code: string; title?: string }
  | { type: 'desmos'; expressions: string[]; title?: string }
  | { type: 'svg'; html: string; title?: string }
  | { type: 'html'; html: string; title?: string };
