import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { tavily } from '@tavily/core';

export const feedbackRouter = Router();

type Turn = { role: 'user' | 'agent'; text: string };
type Source = { title: string; url: string };

const SYSTEM = `You are a fair, precise learning coach grading a Feynman-technique teaching session.
The USER is the teacher explaining a concept. The AGENT (Mila) is the learner asking follow-ups.
Evaluate ONLY the USER's explanations — never grade Mila.

A verified AUTHORITATIVE REFERENCE (from a web search) is provided below. Treat it as ground truth when judging claims.

Be fair and specific:
- If the user taught accurately, most items go into "correct".
- Quote the user's actual phrasing in each item (verbatim, shortened if long).
- Only flag something as "incorrect" if the REFERENCE contradicts the user's claim. In that case, "correction" must state what the reference says.
- "needs_clarification" is for vague hand-waving, skipped prerequisites, or undefined jargon — not minor imprecision.

Return ONLY a single JSON object (no markdown fences) matching exactly:
{
  "overall_score": <integer 0-100>,
  "summary": "<one natural sentence takeaway>",
  "correct": ["<quoted user statement>", ...],
  "needs_clarification": ["<quoted user statement>", ...],
  "incorrect": [{"claim": "<quoted user statement>", "correction": "<what is actually true>"}, ...]
}

If the transcript has no real teaching content (e.g. empty, or only greetings), return overall_score: 0, summary: "Not enough teaching to evaluate.", and empty arrays.`;

function buildTavilyQuery(transcript: Turn[]): string {
  const userTurns = transcript.filter((t) => t.role === 'user').map((t) => t.text.trim()).filter(Boolean);
  if (userTurns.length === 0) return '';
  // First 2 user turns usually introduce the topic.
  const head = userTurns.slice(0, 2).join(' ');
  return head.slice(0, 300);
}

feedbackRouter.post('/', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });

  const transcript: Turn[] | undefined = req.body?.transcript;
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return res.status(400).json({ error: 'transcript required (non-empty array)' });
  }

  const formatted = transcript
    .map((t) => `[${t.role.toUpperCase()}] ${t.text}`)
    .join('\n');

  // Pull an authoritative reference from Tavily before grading.
  let tavilyAnswer = '';
  let tavilySources: Source[] = [];
  const tavilyKey = process.env.TAVILY_API_KEY;
  const query = buildTavilyQuery(transcript);
  if (tavilyKey && query) {
    try {
      const client = tavily({ apiKey: tavilyKey });
      const result = await client.search(query, {
        includeAnswer: 'advanced',
        maxResults: 6,
        searchDepth: 'basic',
      });
      tavilyAnswer = result.answer ?? '';
      tavilySources = (result.results ?? []).slice(0, 6).map((r) => ({
        title: r.title,
        url: r.url,
      }));
      console.log('[feedback] tavily → answer', tavilyAnswer.length, 'chars,', tavilySources.length, 'sources');
    } catch (err) {
      console.warn('[feedback] tavily lookup failed, grading without reference:', err);
    }
  }

  const referenceBlock = tavilyAnswer
    ? `--- AUTHORITATIVE REFERENCE (Tavily web search) ---\n${tavilyAnswer}\n--- END REFERENCE ---\n\n`
    : '';
  const prompt = `${SYSTEM}\n\n${referenceBlock}--- TRANSCRIPT ---\n${formatted}\n--- END ---\n\nRespond with ONLY the JSON object.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const resp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 },
    });

    const text = resp.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[feedback] no JSON in response', text.slice(0, 500));
      return res.status(502).json({ error: 'model returned no JSON', raw: text });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      return res.status(502).json({ error: 'JSON parse failed', detail: String(err), raw: jsonMatch[0] });
    }

    const merged = parsed as Record<string, unknown>;
    merged.sources = tavilySources;

    res.json(merged);
  } catch (err) {
    console.error('[feedback] exception', err);
    res.status(500).json({ error: 'feedback failed', detail: String(err) });
  }
});
