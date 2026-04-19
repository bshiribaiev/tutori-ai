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

const description = `Render a rich, often INTERACTIVE visual on the student's screen. CALL THIS AGGRESSIVELY — any time a diagram, chart, graph, animation, or mini-simulation would clarify something, call it. Never explain visual concepts with only words.

IMPORTANT FLOW:
1. Speak ONE short sentence introducing the visual ("Let me show you...", "Here's a simulation...") — do not call this tool during silence.
2. Immediately call render_visual with the right type and a polished payload.
3. Keep explaining AFTER the visual appears — do not pause.

RENDERER SELECTION (priority order):
• type="html" (DEFAULT) — the most flexible. Supports:
  - Semantic HTML: <div class="card">, <div class="grid">, <div class="row">, <span class="chip">, <h2>, <p>
  - CSS variables: --accent (#38bdf8 cyan), --warm (#fbbf24 amber), --ok (#34d399), --danger (#f87171), --ink (#e2e8f0), --panel (#111a2e), --border
  - Animation utility classes: .pulse, .slide, .bob, .spin, .fade-in (use for living diagrams)
  - Inline <svg> elements for custom shapes
  - Full <script> for INTERACTIVITY: sliders, buttons, live physics, timers, mini-simulations. Scripts run in a sandboxed iframe — safe, no network, no parent access. Use vanilla DOM APIs.
  - <input type="range">, <button>, <select> already styled. Add event listeners in <script>.
• type="mermaid" — flowcharts, sequence diagrams, state machines.
• type="desmos" — math graphs only. expressions is array of LaTeX strings.
• type="svg" — last resort for static bespoke geometry.

STYLE RULES:
- Target aspect ratio 16:9.
- Use CSS variables. Never hardcode hex colors except to match them.
- Labels >= 14px, readable.
- One idea per visual. For a second concept, make a second call.
- PREFER animated/interactive over static when the concept has motion or parameters.

EXAMPLES:

1. Newton's first law — INTERACTIVE (drag to push, inertia visualized):
{
  "type": "html",
  "title": "Newton's First Law",
  "html": "<div class='grid' style='grid-template-columns:1fr 1fr;gap:24px'><div class='card center'><h3>At rest</h3><div style='font-size:3rem;margin:12px 0'>⬛</div><p class='muted'>No net force → stays still</p></div><div class='card center'><h3>In motion</h3><div style='font-size:3rem;margin:12px 0' class='slide'>⬛</div><p class='muted'>No net force → keeps moving</p></div></div><p class='center' style='margin-top:20px'><span class='chip'>F<sub>net</sub> = 0 ⇒ velocity constant</span></p>"
}

2. Adjustable parabola (interactive slider):
{
  "type": "html",
  "title": "y = ax²",
  "html": "<div class='card'><label>a = <span id='val' class='accent'>1</span><input id='s' type='range' min='-2' max='2' step='0.1' value='1'></label><svg id='g' viewBox='-10 -10 20 20' style='width:100%;height:260px;background:transparent'><line x1='-10' y1='0' x2='10' y2='0' stroke='#94a3b8' stroke-width='0.05'/><line x1='0' y1='-10' x2='0' y2='10' stroke='#94a3b8' stroke-width='0.05'/><path id='p' fill='none' stroke='#38bdf8' stroke-width='0.15'/></svg></div><script>const s=document.getElementById('s'),v=document.getElementById('val'),p=document.getElementById('p');function draw(){const a=parseFloat(s.value);v.textContent=a.toFixed(1);let d='M -10 '+(a*100).toFixed(2);for(let x=-10;x<=10;x+=0.2){d+=' L '+x.toFixed(2)+' '+(a*x*x).toFixed(2)}p.setAttribute('d',d);p.setAttribute('transform','scale(1,-1)')}s.addEventListener('input',draw);draw();</script>"
}

3. Photosynthesis (static flowchart):
{
  "type": "mermaid",
  "title": "Photosynthesis",
  "code": "flowchart LR\\n  A[Sunlight] --> C\\n  B[CO₂ + H₂O] --> C[Chloroplast]\\n  C --> D[Glucose]\\n  C --> E[O₂]"
}

4. Bouncing ball (interactive sim with start/stop):
{
  "type": "html",
  "title": "Gravity Demo",
  "html": "<div class='card'><button id='t'>Start</button><svg id='c' viewBox='0 0 400 260' style='width:100%;background:transparent'><line x1='0' y1='250' x2='400' y2='250' stroke='#94a3b8'/><circle id='b' cx='200' cy='30' r='12' fill='#fbbf24'/></svg></div><script>const b=document.getElementById('b'),btn=document.getElementById('t');let y=30,vy=0,r=false;function tick(){if(!r)return;vy+=0.4;y+=vy;if(y>238){y=238;vy*=-0.75}b.setAttribute('cy',y);requestAnimationFrame(tick)}btn.onclick=()=>{r=!r;btn.textContent=r?'Pause':'Start';if(r)tick()};</script>"
}`;

const toolConfig = {
  type: 'client',
  name: 'render_visual',
  description,
  expects_response: true,
  response_timeout_secs: 3,
  force_pre_tool_speech: true,
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
You have a render_visual tool. Call it whenever a picture helps — which is most of the time. PREFER animated or interactive over static.
- Default to type="html". The sandbox supports <script> for real interactivity (sliders, buttons, physics sims, live timers). Use vanilla DOM. Scripts are safe — sandboxed, no network, no parent access.
- Available animation classes in the HTML sandbox: .pulse, .slide, .bob, .spin, .fade-in.
- Available form elements pre-styled: <button>, <input type="range">, <select>, <label>.
- Use CSS variables (--accent, --warm, --ink, --panel, --border) — never hardcode colors.
- type="mermaid" for static flowcharts, sequence/state diagrams.
- type="desmos" ONLY for math graphs.
- type="svg" last resort for static geometry.
- Speak one short intro sentence BEFORE calling the tool, then call it, then keep explaining.
- Never describe a diagram in words without also rendering it.
- If the student changes topic, render a new visual.`;

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
