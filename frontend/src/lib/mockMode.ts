// Dev-only: bypass HeyGen entirely so we can iterate on UI without burning credits.
// Enable by adding ?mock=1 to the URL.

export const IS_MOCK =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mock');

type Step = { userSays: string; agentSays: string; sources?: { title: string; url: string }[] };

export const LEARN_FLOWS: Record<string, Step[]> = {
  newton: [
    { userSays: "Explain Newton's first law.", agentSays: "Sure! Newton's first law says an object at rest stays at rest, and an object in motion stays in motion, unless a net force acts on it. It's why your coffee cup slides forward when you brake in a car." },
  ],
  sine: [
    { userSays: 'Show me the sine function.', agentSays: "The sine function oscillates smoothly between negative one and one. It's the backbone of anything wavy — sound, light, pendulums." },
  ],
  einstein: [
    { userSays: 'What does E equals m c squared mean?', agentSays: "E = mc^2 is Einstein's mass-energy equivalence. Mass and energy are two forms of the same thing, and c squared — the speed of light squared — is a huge conversion factor between them." },
  ],
  pythagoras: [
    { userSays: 'How does the Pythagorean theorem work?', agentSays: "For any right triangle, a^2 + b^2 = c^2. The two shorter sides squared always add up to the hypotenuse squared. It's the foundation of distance in 2D space." },
  ],
  current: [
    { userSays: "What's happening in AI news this week?", agentSays: "According to recent coverage, several major labs shipped new reasoning models and an open-source release reset the frontier.", sources: [{ title: 'TechCrunch', url: 'https://techcrunch.com' }, { title: 'The Verge', url: 'https://theverge.com' }] },
  ],
};

// Teach mode: user teaches, student (Mila) asks follow-ups.
export const TEACH_FLOWS: Record<string, Step[]> = {
  photosynthesis: [
    { userSays: 'Plants make their own food using sunlight.', agentSays: "Ohhh cool! But wait — how does sunlight turn into food? That seems like magic." },
    { userSays: 'They use the light with water and CO2 to make glucose.', agentSays: "Glu-cose? What's that? Is it like sugar?" },
  ],
  gravity: [
    { userSays: 'Gravity is what pulls things toward Earth.', agentSays: "Okay... so why does stuff FALL down? Why not up?" },
    { userSays: "Because Earth is heavy and pulls everything toward its center.", agentSays: "Ohhh! So the bigger something is, the more it pulls? Like the sun pulls planets?" },
  ],
  newton: [
    { userSays: "Newton's first law means things keep moving unless something stops them.", agentSays: "Wait, so if I push my toy car, it would never stop? But it always stops..." },
  ],
};

export const MOCK_FLOWS = {
  learn: LEARN_FLOWS,
  teach: TEACH_FLOWS,
};

export const MOCK_AGENT_FIRST_LINE = {
  learn: "Hey, I'm your tutor. What do you want to learn today?",
  teach: "Hi! I'm Mila, I'm eight. What do you want to teach me today?",
};
