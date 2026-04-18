// Keyword-match transcript text to pre-built visuals.
// Runs on every AVATAR_TRANSCRIPTION event from the EL agent.

export type Visual =
  | { kind: 'equation'; latex: string; caption?: string }
  | { kind: 'plot'; fn: 'sin' | 'cos' | 'parabola' | 'exponential' | 'line'; caption?: string }
  | { kind: 'callout'; title: string; body: string; illo?: 'newton1' | 'newton3' | 'entropy' }
  | { kind: 'diagram'; name: 'pythagoras' | 'solar_system' | 'photosynthesis' };

type Rule = { test: RegExp; visual: Visual };

const RULES: Rule[] = [
  // Famous equations
  { test: /\bE\s*=\s*mc(\^?2|²)/i, visual: { kind: 'equation', latex: 'E = mc^2', caption: "Einstein's mass-energy equivalence" } },
  { test: /\bF\s*=\s*ma\b/i, visual: { kind: 'equation', latex: 'F = ma', caption: "Newton's second law" } },
  { test: /\ba\^?2\s*\+\s*b\^?2\s*=\s*c\^?2/i, visual: { kind: 'diagram', name: 'pythagoras' } },
  { test: /\bPV\s*=\s*nRT\b/i, visual: { kind: 'equation', latex: 'PV = nRT', caption: 'Ideal gas law' } },
  { test: /quadratic formula/i, visual: { kind: 'equation', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', caption: 'Quadratic formula' } },
  { test: /pythagor/i, visual: { kind: 'diagram', name: 'pythagoras' } },

  // Concepts → plots
  { test: /\bsin(e|usoid)\b/i, visual: { kind: 'plot', fn: 'sin', caption: 'sin(x)' } },
  { test: /\bcosin/i, visual: { kind: 'plot', fn: 'cos', caption: 'cos(x)' } },
  { test: /\bparabol|quadratic function/i, visual: { kind: 'plot', fn: 'parabola', caption: 'y = x²' } },
  { test: /\bexponenti/i, visual: { kind: 'plot', fn: 'exponential', caption: 'y = eˣ' } },
  { test: /\blinear function|slope-intercept/i, visual: { kind: 'plot', fn: 'line', caption: 'y = mx + b' } },

  // Laws / concepts → callouts
  { test: /newton'?s first law|first law of motion|law of inertia/i, visual: { kind: 'callout', title: "Newton's First Law", body: 'An object at rest stays at rest, and an object in motion stays in motion, unless acted on by a net force.', illo: 'newton1' } },
  { test: /newton'?s third law|action and reaction/i, visual: { kind: 'callout', title: "Newton's Third Law", body: 'For every action, there is an equal and opposite reaction.', illo: 'newton3' } },
  { test: /second law of thermodynamic|entropy/i, visual: { kind: 'callout', title: 'Second Law of Thermodynamics', body: 'The total entropy of an isolated system never decreases over time.', illo: 'entropy' } },
  { test: /speed of light/i, visual: { kind: 'equation', latex: 'c \\approx 299{,}792{,}458\\ \\text{m/s}', caption: 'Speed of light in vacuum' } },

  // Diagrams
  { test: /solar system|planets orbit/i, visual: { kind: 'diagram', name: 'solar_system' } },
  { test: /photosynthesis/i, visual: { kind: 'diagram', name: 'photosynthesis' } },
];

export function matchVisual(text: string): Visual | null {
  for (const r of RULES) {
    if (r.test.test(text)) return r.visual;
  }
  return null;
}
