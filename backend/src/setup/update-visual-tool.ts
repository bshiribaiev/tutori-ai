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

// Rich description with few-shot examples so the LLM emits quality visuals.
// Paired with force_pre_tool_speech: true — LLM says one short sentence first,
// then calls the tool. That avoids the "big tool-call payload stalls audio"
// bug (LLM generates speech tokens first so audio streams immediately).
const description = `Render a rich, interactive visual. CALL BEFORE you finish speaking so the picture lands as you explain.

RENDERERS (pick one):
• html (DEFAULT) — semantic markup, inline <script>, CSS vars --accent/--warm/--ok/--danger/--ink/--panel/--border, classes .pulse/.slide/.bob/.spin/.fade-in, pre-styled <button>/<input type=range>/<select>. Use for: animated concepts, side-by-side compares, interactive sims with sliders.
• mermaid — flowcharts, sequence/state diagrams. Field: code.
• desmos — math graphs. Field: expressions (LaTeX array).
• svg — static geometry. Field: html with inline <svg viewBox>.

STYLE: 16:9, labels ≥14px, CSS variables over hex, one idea per visual. Prefer animated/interactive over static.

EXAMPLES (these are the BAR; do not generate simpler than these):

1) Newton's First Law — compare panels with animation:
{"type":"html","title":"Newton's First Law","html":"<div class='grid' style='grid-template-columns:1fr 1fr;gap:20px'><div class='card center'><h3>At rest</h3><div style='font-size:4rem;margin:16px 0'>⬛</div><p class='muted'>No net force → stays still</p></div><div class='card center'><h3>In motion</h3><div class='slide' style='font-size:4rem;margin:16px 0'>⬛</div><p class='muted'>No net force → keeps moving</p></div></div><p class='center' style='margin-top:16px'><span class='chip'>F<sub>net</sub> = 0 ⇒ v constant</span></p>"}

2) Interactive parabola slider:
{"type":"html","title":"y = ax²","html":"<div class='card'><label>a = <span id='v' class='accent'>1.0</span><input id='s' type='range' min='-2' max='2' step='0.1' value='1'/></label><svg viewBox='-10 -10 20 20' style='width:100%;height:260px'><line x1='-10' y1='0' x2='10' y2='0' stroke='#94a3b8' stroke-width='0.05'/><line x1='0' y1='-10' x2='0' y2='10' stroke='#94a3b8' stroke-width='0.05'/><path id='p' fill='none' stroke='var(--accent)' stroke-width='0.15'/></svg></div><script>const s=document.getElementById('s'),v=document.getElementById('v'),p=document.getElementById('p');function d(){const a=parseFloat(s.value);v.textContent=a.toFixed(1);let path='M -10 '+(a*100).toFixed(2);for(let x=-10;x<=10;x+=0.2)path+=' L '+x.toFixed(2)+' '+(a*x*x).toFixed(2);p.setAttribute('d',path);p.setAttribute('transform','scale(1,-1)')}s.oninput=d;d();</script>"}

3) Photosynthesis flowchart:
{"type":"mermaid","title":"Photosynthesis","code":"flowchart LR\\n  A[Sunlight]-->C\\n  B[CO₂+H₂O]-->C[Chloroplast]\\n  C-->D[Glucose]\\n  C-->E[O₂]"}

4) Gravity sim with start button:
{"type":"html","title":"Gravity","html":"<div class='card'><button id='t'>Start</button><svg viewBox='0 0 400 260' style='width:100%;background:transparent'><line x1='0' y1='250' x2='400' y2='250' stroke='#94a3b8'/><circle id='b' cx='200' cy='30' r='12' fill='var(--warm)'/></svg></div><script>const b=document.getElementById('b'),btn=document.getElementById('t');let y=30,vy=0,r=false;function tick(){if(!r)return;vy+=0.4;y+=vy;if(y>238){y=238;vy*=-0.75}b.setAttribute('cy',y);requestAnimationFrame(tick)}btn.onclick=()=>{r=!r;btn.textContent=r?'Pause':'Start';if(r)tick()};</script>"}`;

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
- Call render_visual FIRST (before speaking) so the visual appears immediately; then explain the picture.
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
