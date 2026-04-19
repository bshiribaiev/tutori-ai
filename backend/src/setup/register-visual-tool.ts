// One-time: register the `render_visual` CLIENT tool on the Alex tutor agent,
// and add visual-authoring instructions to the agent's system prompt.
import 'dotenv/config';

const el = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID_TUTOR_ALEX;
if (!el || !agentId) {
  console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID_TUTOR_ALEX');
  process.exit(1);
}

const toolConfig = {
  type: 'client',
  name: 'render_visual',
  description:
    'Render a visual on the student\'s screen to illustrate what you are explaining. Always speak a short intro sentence BEFORE calling this tool so the student is not listening to silence while it paints. Use this frequently — any time a diagram, graph, flowchart, or sketch would help understanding, call it. Pick the renderer that best fits:\n\n' +
    '• type="mermaid" — flowcharts, sequence diagrams, state machines, ER diagrams, mind maps, gantt charts, pie charts. Covers biology, CS, history, processes, cause-effect. `code` is Mermaid source.\n' +
    '• type="desmos" — math graphs, functions, equations, geometric curves. `expressions` is an array of LaTeX strings (e.g. ["y=x^2", "y=\\\\sin(x)"]).\n' +
    '• type="svg" — physics diagrams, labeled figures, freeform sketches, anything custom. `html` is an inline <svg>...</svg> with viewBox, strokes, labels. Use stroke="#e2e8f0" or "#38bdf8" for visibility on dark background.\n\n' +
    'Always include a short `title` (3-6 words).',
  expects_response: true,
  response_timeout_secs: 3,
  parameters: {
    type: 'object',
    required: ['type', 'title'],
    properties: {
      type: {
        type: 'string',
        enum: ['mermaid', 'desmos', 'svg'],
        description: 'Which renderer to use.',
      },
      title: {
        type: 'string',
        description: 'Short label for the visual (3-6 words).',
      },
      code: {
        type: 'string',
        description: 'Mermaid source code (only if type=mermaid).',
      },
      expressions: {
        type: 'array',
        items: { type: 'string', description: 'A single LaTeX expression, e.g. y=x^2' },
        description: 'LaTeX expressions (only if type=desmos).',
      },
      html: {
        type: 'string',
        description: 'Inline <svg> markup (only if type=svg). Include viewBox, use light strokes on dark bg.',
      },
    },
  },
};

console.log('Creating render_visual client tool...');
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
if (!toolId) {
  console.error('no tool id in response', createBody);
  process.exit(1);
}
console.log('✓ tool created:', toolId);

// Fetch existing agent to merge tool_ids + update prompt.
const agentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
  headers: { 'xi-api-key': el },
});
const agent = await agentRes.json();
const existingToolIds: string[] = agent?.conversation_config?.agent?.prompt?.tool_ids ?? [];
const existingPrompt: string = agent?.conversation_config?.agent?.prompt?.prompt ?? '';

const visualGuidance = `

VISUAL AUTHORING:
You have a tool called \`render_visual\` that paints a diagram on the student's screen. Use it AGGRESSIVELY — any time a picture would help, call it. Rules:
1. Speak a short intro sentence FIRST ("Let me sketch this out...", "Here's a quick diagram...") — never call the tool mid-sentence or in silence.
2. Choose the renderer that fits: mermaid for flows/diagrams/processes, desmos for math graphs, svg for physics/custom figures.
3. Give a short title. Keep payloads small and focused on ONE idea per visual.
4. After the visual appears, continue explaining — do not pause for confirmation.
5. If the student asks a new question, usually render a new visual for the new concept.`;

const nextPrompt = existingPrompt.includes('VISUAL AUTHORING:')
  ? existingPrompt
  : existingPrompt + visualGuidance;

const nextToolIds = existingToolIds.includes(toolId) ? existingToolIds : [...existingToolIds, toolId];

const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
  method: 'PATCH',
  headers: { 'xi-api-key': el, 'content-type': 'application/json' },
  body: JSON.stringify({
    conversation_config: {
      agent: {
        prompt: {
          prompt: nextPrompt,
          tool_ids: nextToolIds,
        },
      },
    },
  }),
});
const patchBody = await patchRes.text();
if (!patchRes.ok) {
  console.error('attach tool failed', patchRes.status, patchBody);
  process.exit(1);
}
console.log('✓ tool attached to Alex agent + prompt updated');
console.log('\nAgent tool_ids:', nextToolIds);
