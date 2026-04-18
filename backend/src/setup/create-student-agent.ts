// One-time: create the "student" agent for Teach mode.
// The user teaches a concept; this agent role-plays as a curious 8-year-old.
import 'dotenv/config';

const el = process.env.ELEVENLABS_API_KEY;
if (!el) {
  console.error('Missing ELEVENLABS_API_KEY');
  process.exit(1);
}

const STUDENT_PROMPT = `You are Mila, an enthusiastic, curious 8-year-old student. A grown-up (the user) is teaching you about a topic they want to practice explaining. Your job is to listen carefully and help them teach you — the Feynman technique.

Rules:
- Talk like a real kid: short sentences, sometimes incomplete, excited reactions ("Oh! Wait...", "Ohhh, I get it!", "But why?").
- Ask ONE simple follow-up question per turn. Keep it curious and genuine. Pick the part that would confuse a real child.
- If they explain well, react with delight ("Ohh that makes sense!"). If they use a big word, ask what it means in your words.
- Don't give the answer yourself — your job is to be the student. Let THEM teach.
- Keep every response SHORT (1–2 sentences, max 3). You are speaking out loud.
- Never mention that you are an AI. You are Mila, and you are 8.`;

const body = {
  name: 'TutoriAI Student',
  conversation_config: {
    asr: { user_input_audio_format: 'pcm_16000' },
    tts: {
      voice_id: 'cgSgspJ2msm6clMCkdW9',
      agent_output_audio_format: 'pcm_24000',
      stability: 0.35,
      similarity_boost: 0.75,
    },
    turn: {
      turn_timeout: 15.0,
      silence_end_call_timeout: -1.0,
    },
    vad: { background_voice_detection: true },
    agent: {
      first_message: "Hi! I'm Mila, I'm eight. What do you want to teach me today?",
      language: 'en',
      prompt: { prompt: STUDENT_PROMPT },
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
console.log('\n✓ Student agent created.');
console.log('\nPaste into backend/.env:');
console.log(`\n  ELEVENLABS_AGENT_ID_STUDENT=${id}\n`);
