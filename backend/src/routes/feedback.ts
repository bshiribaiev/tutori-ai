import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

export const feedbackRouter = Router();

type Turn = { role: 'user' | 'agent'; text: string };

const SYSTEM = `You are a fair, precise learning coach grading a Feynman-technique teaching session.
The USER is the teacher explaining a concept. The AGENT (Mila) is the learner asking follow-ups.
Evaluate ONLY the USER's explanations — never grade Mila.

Use Google Search to verify specific factual claims that aren't obviously common knowledge.

Be fair and specific:
- If the user taught accurately, most items go into "correct".
- Quote the user's actual phrasing in each item (verbatim, shortened if long).
- Only flag something as "incorrect" if you can point to what's actually true.
- "needs_clarification" is for vague hand-waving, skipped prerequisites, or undefined jargon — not minor imprecision.

Return ONLY a single JSON object (no markdown fences) matching exactly:
{
  "overall_score": <integer 0-100>,
  "summary": "<one natural sentence takeaway>",
  "correct": ["<quoted user statement>", ...],
  "needs_clarification": ["<quoted user statement>", ...],
  "incorrect": [{"claim": "<quoted user statement>", "correction": "<what is actually true>"}, ...],
  "sources": [{"title": "...", "url": "..."}]
}

If the transcript has no real teaching content (e.g. empty, or only greetings), return overall_score: 0, summary: "Not enough teaching to evaluate.", and empty arrays.`;

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

  const prompt = `${SYSTEM}\n\n--- TRANSCRIPT ---\n${formatted}\n--- END ---\n\nRespond with ONLY the JSON object.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const resp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
      },
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

    // Merge grounding sources (from Google Search) into response.sources
    const chunks =
      resp.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const groundingSources = chunks
      .map((c) => ({
        title: c.web?.title ?? c.web?.domain ?? 'source',
        url: c.web?.uri ?? '',
      }))
      .filter((s) => s.url);

    const merged = parsed as Record<string, unknown>;
    const existing = Array.isArray(merged.sources) ? (merged.sources as { title: string; url: string }[]) : [];
    const seen = new Set(existing.map((s) => s.url));
    for (const g of groundingSources) {
      if (g.url && !seen.has(g.url)) {
        existing.push(g);
        seen.add(g.url);
      }
    }
    merged.sources = existing;

    res.json(merged);
  } catch (err) {
    console.error('[feedback] exception', err);
    res.status(500).json({ error: 'feedback failed', detail: String(err) });
  }
});
