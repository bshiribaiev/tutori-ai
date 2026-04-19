// One-time: create 3 new specialized tutor agents (History, Interview, English)
// and retask the existing main tutor agent into a Math tutor.
// All share Ann's voice + tool bindings; only the system prompt differs.
import 'dotenv/config';

const elKey = process.env.ELEVENLABS_API_KEY;
const baseAgentId = process.env.ELEVENLABS_AGENT_ID;
if (!elKey || !baseAgentId) {
  console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID');
  process.exit(1);
}
const el: string = elKey;

const BASE_RULES = `Keep every spoken response SHORT — 1–3 sentences unless the student explicitly asks for more. No filler words ("So," "Well," "Great question"). You are speaking out loud; do not narrate your own behavior. Never mention that you are an AI. Use the search_web tool whenever you need a specific fact, date, quote, or current-source citation. If the student changes topic, follow them.`;

const SPECIALISTS = {
  math: {
    name: 'TutoriAI Math (Ann)',
    first_message: 'Hi, I\'m Ann — your math tutor. What do you want to work on today?',
    prompt: `You are a math tutor specializing in algebra, calculus, geometry, and statistics. Explain with clear step-by-step reasoning. When a formula, theorem, or worked example would help, describe it briefly and give one concrete numeric instance. Use proper mathematical vocabulary. ${BASE_RULES}`,
  },
  history: {
    name: 'TutoriAI History',
    first_message: 'Hi, I\'m your history tutor. What period or event are you curious about?',
    prompt: `You are a history tutor. You explain events, figures, and causes with narrative clarity and accuracy. Structure complex topics as timelines or cause-and-effect chains. Always verify specific dates, numbers, or quotes with the search_web tool before stating them. Highlight the human and political motivations behind events. ${BASE_RULES}`,
  },
  interview: {
    name: 'TutoriAI Interview Coach',
    first_message: 'Hi, I\'m your interview coach. Tell me the role you\'re prepping for and we\'ll start with a behavioral question.',
    prompt: `You are a behavioral interview coach. Help the user practice answering questions using the STAR method (Situation, Task, Action, Result). Ask ONE question at a time, wait for the answer, then give specific feedback on structure, specificity, and impact. Be encouraging but direct — if an answer is vague, say so and push for a concrete example. If the user names a company or role, use search_web to pull real context. ${BASE_RULES}`,
  },
  english: {
    name: 'TutoriAI English',
    first_message: 'Hi, I\'m your English tutor. Grammar, writing, literature — what are we tackling?',
    prompt: `You are an English and writing tutor. You help with grammar, literary analysis, writing craft, and vocabulary. Give precise rules and one concrete example for each. When discussing a specific work, author, or historical usage, use search_web to verify and cite. For writing feedback, be specific about what works and what doesn't. ${BASE_RULES}`,
  },
};

// Pull Ann's existing config for voice + tool_ids template.
const baseRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${baseAgentId}`, {
  headers: { 'xi-api-key': el },
});
if (!baseRes.ok) {
  console.error('failed to fetch base agent', baseRes.status, await baseRes.text());
  process.exit(1);
}
const base = await baseRes.json();
const baseTts = base?.conversation_config?.tts ?? {};
const baseToolIds: string[] = base?.conversation_config?.agent?.prompt?.tool_ids ?? [];

function agentBody(name: string, first_message: string, prompt: string) {
  return {
    name,
    conversation_config: {
      asr: { user_input_audio_format: 'pcm_16000' },
      tts: {
        voice_id: baseTts.voice_id,
        agent_output_audio_format: baseTts.agent_output_audio_format ?? 'pcm_24000',
        stability: baseTts.stability ?? 0.4,
        similarity_boost: baseTts.similarity_boost ?? 0.75,
      },
      turn: { turn_timeout: 15.0, silence_end_call_timeout: -1.0 },
      vad: { background_voice_detection: true },
      agent: {
        first_message,
        language: 'en',
        prompt: { prompt, tool_ids: baseToolIds },
      },
    },
  };
}

async function createAgent(name: string, first_message: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
    method: 'POST',
    headers: { 'xi-api-key': el, 'content-type': 'application/json' },
    body: JSON.stringify(agentBody(name, first_message, prompt)),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`create ${name} failed ${res.status}: ${text}`);
  const parsed = JSON.parse(text);
  return parsed.agent_id ?? parsed.id;
}

// 1. Retask the base agent into Math (Ann).
console.log('Patching base agent → Math (Ann)...');
const mathSpec = SPECIALISTS.math;
const mathPatchRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${baseAgentId}`, {
  method: 'PATCH',
  headers: { 'xi-api-key': el, 'content-type': 'application/json' },
  body: JSON.stringify({
    name: mathSpec.name,
    conversation_config: {
      agent: {
        first_message: mathSpec.first_message,
        prompt: { prompt: mathSpec.prompt, tool_ids: baseToolIds },
      },
    },
  }),
});
if (!mathPatchRes.ok) {
  console.error('math patch failed', mathPatchRes.status, await mathPatchRes.text());
  process.exit(1);
}
console.log('✓ Math agent (Ann) is now', baseAgentId);

// 2. Create 3 new specialists.
const historyId = await createAgent(SPECIALISTS.history.name, SPECIALISTS.history.first_message, SPECIALISTS.history.prompt);
console.log('✓ History agent created:', historyId);
const interviewId = await createAgent(SPECIALISTS.interview.name, SPECIALISTS.interview.first_message, SPECIALISTS.interview.prompt);
console.log('✓ Interview agent created:', interviewId);
const englishId = await createAgent(SPECIALISTS.english.name, SPECIALISTS.english.first_message, SPECIALISTS.english.prompt);
console.log('✓ English agent created:', englishId);

console.log('\nAdd to backend/.env (and Vercel env):');
console.log(`\n  ELEVENLABS_AGENT_ID_MATH=${baseAgentId}`);
console.log(`  ELEVENLABS_AGENT_ID_HISTORY=${historyId}`);
console.log(`  ELEVENLABS_AGENT_ID_INTERVIEW=${interviewId}`);
console.log(`  ELEVENLABS_AGENT_ID_ENGLISH=${englishId}`);
console.log(`\n  HEYGEN_AVATAR_ID_MATH=513fd1b7-7ef9-466d-9af2-344e51eeb833`);
console.log(`  HEYGEN_AVATAR_ID_HISTORY=7b888024-f8c9-4205-95e1-78ce01497bda`);
console.log(`  HEYGEN_AVATAR_ID_INTERVIEW=073b60a9-89a8-45aa-8902-c358f64d2852`);
console.log(`  HEYGEN_AVATAR_ID_ENGLISH=e9844e6d-847e-4964-a92b-7ecd066f69df\n`);
