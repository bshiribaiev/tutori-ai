// One-time: register the Tavily webhook as a server tool on our EL Agent.
// Reads PUBLIC_BACKEND_URL from env (your ngrok/Vercel origin).
// Creates the tool, then attaches its ID to the agent's tool_ids array.
import 'dotenv/config';

const el = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
const publicUrl = process.env.PUBLIC_BACKEND_URL;
if (!el || !agentId || !publicUrl) {
  console.error('Missing ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, or PUBLIC_BACKEND_URL');
  console.error('Set PUBLIC_BACKEND_URL to your ngrok/Vercel URL (e.g. https://abc123.ngrok.app).');
  process.exit(1);
}

const webhookUrl = `${publicUrl.replace(/\/$/, '')}/api/tavily`;

// Create the tool.
const toolConfig = {
  type: 'webhook',
  name: 'search_web',
  description:
    'Search the web for current facts, recent events, specific data, or anything the assistant does not reliably know from training. Always use this for questions about current events, recent news, specific numbers/dates, or when accuracy matters.',
  api_schema: {
    url: webhookUrl,
    method: 'POST',
    content_type: 'application/json',
    request_body_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Concise search query distilled from the user question. 3-10 words.',
        },
      },
      required: ['query'],
    },
  },
};

console.log('Registering tool at', webhookUrl);
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

// Attach to agent: merge into conversation_config.agent.prompt.tool_ids.
const agentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
  headers: { 'xi-api-key': el },
});
const agent = await agentRes.json();
const existing: string[] = agent?.conversation_config?.agent?.prompt?.tool_ids ?? [];
if (existing.includes(toolId)) {
  console.log('tool already attached to agent');
  process.exit(0);
}
const nextToolIds = [...existing, toolId];

const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
  method: 'PATCH',
  headers: { 'xi-api-key': el, 'content-type': 'application/json' },
  body: JSON.stringify({
    conversation_config: {
      agent: { prompt: { tool_ids: nextToolIds } },
    },
  }),
});
const patchBody = await patchRes.text();
if (!patchRes.ok) {
  console.error('attach tool failed', patchRes.status, patchBody);
  process.exit(1);
}
console.log('✓ tool attached to agent');
console.log('\nAgent now has tool_ids:', nextToolIds);
