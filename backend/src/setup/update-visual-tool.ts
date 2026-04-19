// Update the existing render_visual tool: add 'html' type, richer style guidance,
// few-shot examples. Also refresh the Alex agent's prompt with tighter visual rules.
import 'dotenv/config';

const el = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID_TUTOR_ALEX;
if (!el || !agentId) {
  console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID_TUTOR_ALEX');
  process.exit(1);
}

// Locate the render_visual tool by listing tools.
const listRes = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
  headers: { 'xi-api-key': el },
});
const list = await listRes.json();
type ToolMeta = { id?: string; tool_id?: string; tool_config?: { name?: string } };
const tools: ToolMeta[] = list.tools ?? list ?? [];
const existing = tools.find((t) => t?.tool_config?.name === 'render_visual');
if (!existing) {
  console.error('render_visual tool not found. Run register-visual-tool.ts first.');
  process.exit(1);
}
const toolId = existing.id ?? existing.tool_id;
if (!toolId) {
  console.error('tool has no id:', JSON.stringify(existing).slice(0, 300));
  process.exit(1);
}
console.log('Found tool:', toolId);

const description = `Render a rich visual on the student's screen to illustrate what you are explaining. CALL THIS AGGRESSIVELY — any time a diagram, chart, graph, or figure would clarify something, call it. Never explain visual concepts with only words.

IMPORTANT FLOW:
1. Speak ONE short sentence introducing the visual ("Let me show you...", "Here's a diagram...") — do not call this tool during silence.
2. Immediately call render_visual with the right type and a polished payload.
3. Keep explaining AFTER the visual appears — do not pause.

RENDERER SELECTION (pick the BEST fit, in priority order):
• type="html" (DEFAULT for concept explanations) — labeled diagrams, side-by-side comparisons, definitions, cause/effect cards. Use semantic HTML: <div class="card">, <div class="grid">, <div class="row">, <span class="chip">, <h2>, <p>. The sandbox already provides dark theme + CSS variables (--accent #38bdf8, --warm #fbbf24, --ok #34d399, --danger #f87171, --ink #e2e8f0, --panel #111a2e, --border rgba(255,255,255,0.1)). You can include inline <svg> inside <div class="card"> for custom shapes, and it inherits the typography.
• type="mermaid" — flowcharts, sequence diagrams, state machines, ER diagrams, mind maps, pie charts. Use when the relationship is inherently graph-shaped.
• type="desmos" — math graphs and functions ONLY. expressions is an array of LaTeX strings.
• type="svg" — fallback when you need a single bespoke figure and HTML won't work. Always include viewBox, use stroke="#e2e8f0" lines and fill="#38bdf8" shapes.

STYLE RULES (non-negotiable):
- Target aspect ratio is 16:9 — design to that.
- Use the provided CSS variables. NEVER hardcode "blue", #3b82f6, or raw Tailwind-like classes.
- Labels must be readable — font size >= 14px. Align text with its subject.
- Prefer concepts drawn with labeled callouts and arrows, not raw geometry.
- One idea per visual. If you need two concepts, make two sequential calls.

EXAMPLES:

1. Newton's first law (use HTML, NOT svg):
{
  "type": "html",
  "title": "Newton's First Law",
  "html": "<div class='grid' style='grid-template-columns:1fr 1fr;gap:24px'><div class='card center'><h3>At rest</h3><div style='font-size:3rem;margin:12px 0'>⬛</div><p class='muted'>No net force → stays still</p></div><div class='card center'><h3>In motion</h3><div style='font-size:3rem;margin:12px 0'>⬛ <span class='accent'>→</span></div><p class='muted'>No net force → keeps moving</p></div></div><p class='center' style='margin-top:20px'><span class='chip'>F<sub>net</sub> = 0 ⇒ velocity constant</span></p>"
}

2. Photosynthesis process:
{
  "type": "mermaid",
  "title": "Photosynthesis",
  "code": "flowchart LR\\n  A[Sunlight] --> C\\n  B[CO₂ + H₂O] --> C[Chloroplast]\\n  C --> D[Glucose]\\n  C --> E[O₂]"
}

3. y = x² graph:
{
  "type": "desmos",
  "title": "Parabola y = x²",
  "expressions": ["y=x^2"]
}

4. Pythagorean theorem (svg, because HTML is less natural for geometry):
{
  "type": "svg",
  "title": "Pythagoras",
  "html": "<svg viewBox='0 0 300 220' width='100%'><polygon points='50,180 250,180 50,60' fill='none' stroke='#38bdf8' stroke-width='2'/><text x='145' y='200' fill='#e2e8f0' font-size='14' text-anchor='middle'>b</text><text x='28' y='125' fill='#e2e8f0' font-size='14' text-anchor='middle'>a</text><text x='165' y='115' fill='#fbbf24' font-size='14' text-anchor='middle'>c</text><text x='150' y='40' fill='#e2e8f0' font-size='16' text-anchor='middle'>a² + b² = c²</text></svg>"
}`;

const toolConfig = {
  type: 'client',
  name: 'render_visual',
  description,
  expects_response: true,
  response_timeout_secs: 3,
  parameters: {
    type: 'object',
    required: ['type', 'title'],
    properties: {
      type: {
        type: 'string',
        enum: ['html', 'mermaid', 'desmos', 'svg'],
        description: 'Renderer. Prefer html > mermaid > desmos > svg.',
      },
      title: {
        type: 'string',
        description: 'Short label (3-6 words).',
      },
      html: {
        type: 'string',
        description: 'Body markup. For type=html: inline HTML that uses provided CSS variables. For type=svg: a single <svg> element with viewBox.',
      },
      code: {
        type: 'string',
        description: 'Mermaid source code (only if type=mermaid).',
      },
      expressions: {
        type: 'array',
        items: { type: 'string', description: 'A single LaTeX expression.' },
        description: 'LaTeX expressions (only if type=desmos).',
      },
    },
  },
};

console.log('Patching tool...');
const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
  method: 'PATCH',
  headers: { 'xi-api-key': el, 'content-type': 'application/json' },
  body: JSON.stringify({ tool_config: toolConfig }),
});
const patchBody = await patchRes.text();
if (!patchRes.ok) {
  console.error('tool patch failed', patchRes.status, patchBody);
  process.exit(1);
}
console.log('✓ tool updated');

// Update the Alex agent prompt to emphasize visual discipline.
const agentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
  headers: { 'xi-api-key': el },
});
const agent = await agentRes.json();
const currentPrompt: string = agent?.conversation_config?.agent?.prompt?.prompt ?? '';

const visualSection = `

VISUAL AUTHORING (USE AGGRESSIVELY):
You have a render_visual tool. Call it whenever a picture helps — which is most of the time.
- Default to type="html" for concept explanations. Use the sandbox's CSS variables (--accent, --warm, --ink, etc.) — never hardcode colors.
- Use type="mermaid" for flowcharts, processes, state machines.
- Use type="desmos" ONLY for math graphs.
- Use type="svg" as a last resort for custom geometry.
- Speak one short intro sentence BEFORE calling the tool, then call it, then keep explaining.
- Never describe a diagram in words without also rendering it.
- If the student switches topic, render a new visual.`;

// Remove any previous VISUAL AUTHORING section and append the fresh one.
const strippedPrompt = currentPrompt.replace(/\s*VISUAL AUTHORING[\s\S]*$/i, '').trim();
const nextPrompt = strippedPrompt + visualSection;

const patchAgentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
  method: 'PATCH',
  headers: { 'xi-api-key': el, 'content-type': 'application/json' },
  body: JSON.stringify({
    conversation_config: { agent: { prompt: { prompt: nextPrompt } } },
  }),
});
const patchAgentBody = await patchAgentRes.text();
if (!patchAgentRes.ok) {
  console.error('agent prompt update failed', patchAgentRes.status, patchAgentBody);
  process.exit(1);
}
console.log('✓ agent prompt refreshed');
