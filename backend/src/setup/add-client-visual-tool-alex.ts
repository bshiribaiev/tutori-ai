// Create a CLIENT render_visual tool + attach ONLY to Alex.
// HeyGen tutors keep the existing webhook server tool (no choice — they can't receive client-tool events).
import 'dotenv/config';

const elKey = process.env.ELEVENLABS_API_KEY;
const alexId = process.env.ELEVENLABS_AGENT_ID_TUTOR_ALEX;
if (!elKey || !alexId) {
  console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID_TUTOR_ALEX');
  process.exit(1);
}
const el: string = elKey;

const description = `Render a visual on the student's screen. Use SPARINGLY — at most once per turn, only when a diagram genuinely helps (math graphs, labeled physics figures, step-by-step processes). Never call mid-sentence.

RENDERERS:
• html — diagrams, cards, animated/interactive figures (supports <script>, CSS vars --accent/--warm/--ink/--panel/--border, utility classes .pulse/.slide/.bob/.spin, pre-styled <button>, <input type="range">).
• mermaid — flowcharts, sequence/state diagrams.
• desmos — math graphs. expressions is LaTeX array.
• svg — inline <svg> for custom geometry.

Example (Newton's law, html):
{"type":"html","title":"Newton's First Law","html":"<div class='grid' style='grid-template-columns:1fr 1fr;gap:24px'><div class='card center'><h3>At rest</h3><div style='font-size:3rem;margin:12px 0'>⬛</div><p class='muted'>stays still</p></div><div class='card center'><h3>In motion</h3><div style='font-size:3rem;margin:12px 0' class='slide'>⬛</div><p class='muted'>keeps moving</p></div></div>"}

Example (parabola, desmos):
{"type":"desmos","title":"y = x²","expressions":["y=x^2"]}`;

const toolConfig = {
  type: 'client',
  name: 'render_visual',
  description,
  expects_response: true,
  response_timeout_secs: 3,
  force_pre_tool_speech: false,
  parameters: {
    type: 'object',
    required: ['type', 'title'],
    properties: {
      type: { type: 'string', enum: ['html', 'mermaid', 'desmos', 'svg'], description: 'Renderer.' },
      title: { type: 'string', description: 'Short label (3-6 words).' },
      html: { type: 'string', description: 'HTML body for type=html, or inline <svg> for type=svg.' },
      code: { type: 'string', description: 'Mermaid source (only if type=mermaid).' },
      expressions: {
        type: 'array',
        items: { type: 'string', description: 'A single LaTeX expression.' },
        description: 'LaTeX expressions (only if type=desmos).',
      },
    },
  },
};

console.log('Creating client render_visual tool...');
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
const toolId = created.id ?? created.tool_id;
console.log('✓ client tool:', toolId);

// Attach to Alex's tool_ids.
const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${alexId}`, {
  headers: { 'xi-api-key': el },
});
const agent = await r.json();
const current: string[] = agent?.conversation_config?.agent?.prompt?.tool_ids ?? [];
const next = current.includes(toolId) ? current : [...current, toolId];
const patch = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${alexId}`, {
  method: 'PATCH',
  headers: { 'xi-api-key': el, 'content-type': 'application/json' },
  body: JSON.stringify({ conversation_config: { agent: { prompt: { tool_ids: next } } } }),
});
console.log('attach to Alex', patch.ok ? 'OK' : 'FAIL ' + patch.status);
console.log('Alex tool_ids:', next);
