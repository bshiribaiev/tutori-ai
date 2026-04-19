// Migrate render_visual from CLIENT tool to SERVER tool so the visual pipeline
// works on both direct-EL (Alex) and HeyGen-LITE paths.
// - Deletes the old client tool (+ detaches it from all agents)
// - Creates a new server tool pointing at ${PUBLIC_BACKEND_URL}/api/visual/push
// - Attaches the new tool to all 5 tutor agents (alex, math, history, interview, english)
import 'dotenv/config';

const elKey = process.env.ELEVENLABS_API_KEY;
const publicUrl = process.env.PUBLIC_BACKEND_URL;
if (!elKey || !publicUrl) {
  console.error('Missing ELEVENLABS_API_KEY or PUBLIC_BACKEND_URL');
  process.exit(1);
}
const el: string = elKey;

const TUTOR_AGENT_ENVS = [
  'ELEVENLABS_AGENT_ID_TUTOR_ALEX',
  'ELEVENLABS_AGENT_ID_MATH',
  'ELEVENLABS_AGENT_ID_HISTORY',
  'ELEVENLABS_AGENT_ID_INTERVIEW',
  'ELEVENLABS_AGENT_ID_ENGLISH',
];

const tutorAgentIds = TUTOR_AGENT_ENVS.map((k) => ({ key: k, id: process.env[k] }))
  .filter((x): x is { key: string; id: string } => Boolean(x.id));

if (tutorAgentIds.length === 0) {
  console.error('No tutor agent IDs in env. Populate .env first.');
  process.exit(1);
}

const webhookUrl = `${publicUrl.replace(/\/$/, '')}/api/visual/push`;

// List existing tools, find any render_visual tools (client or server).
const listRes = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
  headers: { 'xi-api-key': el },
});
if (!listRes.ok) {
  console.error('list tools failed', listRes.status, await listRes.text());
  process.exit(1);
}
type ToolMeta = { id?: string; tool_id?: string; tool_config?: { name?: string; type?: string } };
const list = await listRes.json();
const allTools: ToolMeta[] = list.tools ?? list ?? [];
const oldTools = allTools.filter((t) => t?.tool_config?.name === 'render_visual');
console.log(`Found ${oldTools.length} existing render_visual tool(s).`);

// Detach old tools from every tutor agent first.
for (const t of oldTools) {
  const oldId = t.id ?? t.tool_id;
  if (!oldId) continue;
  for (const { key, id } of tutorAgentIds) {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, {
      headers: { 'xi-api-key': el },
    });
    const agent = await r.json();
    const current: string[] = agent?.conversation_config?.agent?.prompt?.tool_ids ?? [];
    if (!current.includes(oldId)) continue;
    const next = current.filter((x) => x !== oldId);
    const patch = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, {
      method: 'PATCH',
      headers: { 'xi-api-key': el, 'content-type': 'application/json' },
      body: JSON.stringify({ conversation_config: { agent: { prompt: { tool_ids: next } } } }),
    });
    if (!patch.ok) {
      console.warn(`  detach from ${key} failed`, patch.status, await patch.text());
    } else {
      console.log(`  detached ${oldId} from ${key}`);
    }
  }
  // Delete the old tool.
  const del = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${oldId}`, {
    method: 'DELETE',
    headers: { 'xi-api-key': el },
  });
  if (!del.ok) {
    console.warn('  delete old tool failed', del.status, await del.text());
  } else {
    console.log('  deleted old tool', oldId);
  }
}

// Create the new SERVER tool (type: webhook).
const description = `Render a rich, often INTERACTIVE visual on the student's screen. CALL THIS AGGRESSIVELY — any time a diagram, chart, graph, or simulation would clarify something, call it. Never explain visual concepts with only words.

FLOW:
1. Call render_visual FIRST with the right type and payload — the visual should appear immediately.
2. Then speak, explaining what's on screen.

RENDERERS (priority html > mermaid > desmos > svg):
• html — default; supports <script> for interactivity, CSS variables (--accent, --warm, --ok, --danger, --ink, --panel, --border), utility classes (.pulse .slide .bob .spin .fade-in), pre-styled <button>/<input type=range>/<select>.
• mermaid — flowcharts, sequence/state diagrams.
• desmos — math graphs; expressions is LaTeX strings.
• svg — last resort for static geometry.

RULES: aspect 16:9, use CSS vars never hex, labels ≥14px, one idea per visual, PREFER animated/interactive over static.

EXAMPLES:

1. Newton's first law:
{"type":"html","title":"Newton's First Law","html":"<div class='grid' style='grid-template-columns:1fr 1fr;gap:24px'><div class='card center'><h3>At rest</h3><div style='font-size:3rem;margin:12px 0'>⬛</div><p class='muted'>stays still</p></div><div class='card center'><h3>In motion</h3><div style='font-size:3rem;margin:12px 0' class='slide'>⬛</div><p class='muted'>keeps moving</p></div></div><p class='center' style='margin-top:20px'><span class='chip'>F=0 ⇒ v constant</span></p>"}

2. Interactive parabola:
{"type":"html","title":"y = ax²","html":"<div class='card'><label>a = <span id='v' class='accent'>1</span><input id='s' type='range' min='-2' max='2' step='0.1' value='1'></label><svg viewBox='-10 -10 20 20' style='width:100%;height:260px'><path id='p' fill='none' stroke='#38bdf8' stroke-width='0.15'/></svg></div><script>const s=document.getElementById('s'),v=document.getElementById('v'),p=document.getElementById('p');function d(){const a=parseFloat(s.value);v.textContent=a.toFixed(1);let path='M -10 '+(a*100).toFixed(2);for(let x=-10;x<=10;x+=0.2)path+=' L '+x.toFixed(2)+' '+(a*x*x).toFixed(2);p.setAttribute('d',path);p.setAttribute('transform','scale(1,-1)')}s.oninput=d;d();</script>"}

3. Photosynthesis:
{"type":"mermaid","title":"Photosynthesis","code":"flowchart LR\\n  A[Sunlight]-->C\\n  B[CO₂+H₂O]-->C[Chloroplast]\\n  C-->D[Glucose]\\n  C-->E[O₂]"}

4. Bouncing ball sim:
{"type":"html","title":"Gravity","html":"<div class='card'><button id='t'>Start</button><svg id='c' viewBox='0 0 400 260' style='width:100%'><line x1='0' y1='250' x2='400' y2='250' stroke='#94a3b8'/><circle id='b' cx='200' cy='30' r='12' fill='#fbbf24'/></svg></div><script>const b=document.getElementById('b'),btn=document.getElementById('t');let y=30,vy=0,r=false;function tick(){if(!r)return;vy+=0.4;y+=vy;if(y>238){y=238;vy*=-0.75}b.setAttribute('cy',y);requestAnimationFrame(tick)}btn.onclick=()=>{r=!r;btn.textContent=r?'Pause':'Start';if(r)tick()};</script>"}`;

const toolConfig = {
  type: 'webhook',
  name: 'render_visual',
  description,
  response_timeout_secs: 5,
  api_schema: {
    url: webhookUrl,
    method: 'POST',
    content_type: 'application/json',
    request_body_schema: {
      type: 'object',
      required: ['visual_session_id', 'type', 'title'],
      properties: {
        visual_session_id: {
          type: 'string',
          dynamic_variable: 'visual_session_id',
        },
        type: {
          type: 'string',
          enum: ['html', 'mermaid', 'desmos', 'svg'],
          description: 'Renderer. Prefer html > mermaid > desmos > svg.',
        },
        title: { type: 'string', description: 'Short label (3-6 words).' },
        html: {
          type: 'string',
          description: 'HTML body for type=html, or inline <svg> for type=svg.',
        },
        code: {
          type: 'string',
          description: 'Mermaid source (only if type=mermaid).',
        },
        expressions: {
          type: 'array',
          items: { type: 'string', description: 'A single LaTeX expression.' },
          description: 'LaTeX expressions (only if type=desmos).',
        },
      },
    },
  },
};

console.log('\nCreating new server tool →', webhookUrl);
const createRes = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
  method: 'POST',
  headers: { 'xi-api-key': el, 'content-type': 'application/json' },
  body: JSON.stringify({ tool_config: toolConfig }),
});
const createBody = await createRes.text();
if (!createRes.ok) {
  console.error('create tool failed', createRes.status, createBody);
  process.exit(1);
}
const created = JSON.parse(createBody);
const newToolId = created.id ?? created.tool_id;
console.log('✓ new tool:', newToolId);

// Attach new tool to every tutor agent.
const visualGuidance = `

VISUAL AUTHORING (USE AGGRESSIVELY):
render_visual is a webhook that paints a rich visual on the student's screen. PREFER animated or interactive over static.
- Default type="html". The sandbox supports <script> for interactivity. Use CSS vars (--accent, --warm, --ink, --panel, --border) — never hardcode colors.
- type="mermaid" for flowcharts. type="desmos" ONLY for math graphs. type="svg" last resort.
- Call render_visual FIRST (before speaking) so the visual appears immediately; then explain.
- Never describe a diagram in words without also rendering it.
- If the student changes topic, render a new visual.`;

for (const { key, id } of tutorAgentIds) {
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, {
    headers: { 'xi-api-key': el },
  });
  const agent = await r.json();
  const current: string[] = agent?.conversation_config?.agent?.prompt?.tool_ids ?? [];
  const nextToolIds = current.includes(newToolId) ? current : [...current, newToolId];

  const currentPrompt: string = agent?.conversation_config?.agent?.prompt?.prompt ?? '';
  const strippedPrompt = currentPrompt.replace(/\s*VISUAL AUTHORING[\s\S]*$/i, '').trim();
  const nextPrompt = strippedPrompt + visualGuidance;

  const patch = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': el, 'content-type': 'application/json' },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: { prompt: nextPrompt, tool_ids: nextToolIds },
        },
      },
    }),
  });
  if (!patch.ok) {
    console.error(`  attach to ${key} failed`, patch.status, await patch.text());
  } else {
    console.log(`✓ attached to ${key} (${id})`);
  }
}

console.log('\nDone. EL will POST visuals to:', webhookUrl);
