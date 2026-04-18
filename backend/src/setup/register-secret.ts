// One-time: register our ElevenLabs API key with LiveAvatar so LITE mode
// can authenticate to ElevenLabs on our behalf. Prints the secret_id to paste
// into backend/.env as ELEVENLABS_SECRET_ID.
import 'dotenv/config';

const key = process.env.HEYGEN_API_KEY;
const el = process.env.ELEVENLABS_API_KEY;
if (!key || !el) {
  console.error('Missing HEYGEN_API_KEY or ELEVENLABS_API_KEY in backend/.env');
  process.exit(1);
}

const res = await fetch('https://api.liveavatar.com/v1/secrets', {
  method: 'POST',
  headers: { 'x-api-key': key, 'content-type': 'application/json' },
  body: JSON.stringify({
    secret_name: 'hack-brooklyn-elevenlabs',
    secret_value: el,
    secret_type: 'ELEVENLABS_API_KEY',
  }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`register-secret failed: ${res.status}`, text);
  process.exit(1);
}

const parsed = JSON.parse(text);
const id = parsed?.data?.id;
if (!id) {
  console.error('No id in response', text);
  process.exit(1);
}

console.log('\n✓ Secret registered.');
console.log('\nPaste this into backend/.env:');
console.log(`\n  ELEVENLABS_SECRET_ID=${id}\n`);
