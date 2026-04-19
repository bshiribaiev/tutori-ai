// One-time: create the "Alex" tutor agent — same persona as existing tutor,
// male voice (Dylan Explains). Clones prompt + tools from the main tutor agent.
import 'dotenv/config';

const el = process.env.ELEVENLABS_API_KEY;
const sourceAgentId = process.env.ELEVENLABS_AGENT_ID;
if (!el || !sourceAgentId) {
  console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID');
  process.exit(1);
}

const ALEX_VOICE_ID = 'QIhD5ivPGEoYZQDocuHI';

// Pull the existing tutor agent to copy its prompt + tool bindings.
const srcRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${sourceAgentId}`, {
  headers: { 'xi-api-key': el },
});
if (!srcRes.ok) {
  console.error('failed to fetch source agent', srcRes.status, await srcRes.text());
  process.exit(1);
}
const src = await srcRes.json();
const srcPromptCfg = src?.conversation_config?.agent?.prompt ?? {};
const srcFirstMsg = src?.conversation_config?.agent?.first_message ?? 'Hi, I\'m your tutor. What would you like to learn about today?';

const body = {
  name: 'TutoriAI Tutor (Alex)',
  conversation_config: {
    asr: { user_input_audio_format: 'pcm_16000' },
    tts: {
      voice_id: ALEX_VOICE_ID,
      agent_output_audio_format: 'pcm_24000',
      stability: 0.4,
      similarity_boost: 0.75,
    },
    turn: {
      turn_timeout: 15.0,
      silence_end_call_timeout: -1.0,
    },
    vad: { background_voice_detection: true },
    agent: {
      first_message: srcFirstMsg,
      language: 'en',
      prompt: {
        prompt: srcPromptCfg.prompt,
        tool_ids: srcPromptCfg.tool_ids ?? [],
      },
    },
  },
};

const res = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
  method: 'POST',
  headers: { 'xi-api-key': el, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) {
  console.error('create failed', res.status, text);
  process.exit(1);
}
const parsed = JSON.parse(text);
const id = parsed.agent_id ?? parsed.id;
console.log('\n✓ Alex tutor agent created.');
console.log('\nPaste into backend/.env:');
console.log(`\n  ELEVENLABS_AGENT_ID_TUTOR_ALEX=${id}\n`);
