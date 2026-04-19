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

// Keep description LEAN. Long descriptions + long few-shots bias the LLM to
// emit giant HTML payloads, which stall audio ~30s while the tool-call JSON is
// being inlined. Short description → small payloads → no audio stall.
const description = `Render a visual on the student's screen. CALL FIRST, before speaking, so the picture appears instantly; then explain.

TYPES:
- html: interactive diagrams (<script> allowed; CSS vars --accent/--warm/--ink/--panel/--border; classes .pulse/.slide/.bob/.spin). Keep html body under ~400 chars.
- mermaid: flowcharts/sequence (code).
- desmos: math graphs (expressions: LaTeX array).
- svg: static geometry (html: <svg>…</svg>).

Target 16:9, labels ≥14px, one idea per visual. Prefer short payloads — long ones stall audio.`;

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
