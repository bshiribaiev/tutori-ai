import { Router } from 'express';
import { tavily } from '@tavily/core';

export const tavilyRouter = Router();

// Server-tool webhook: ElevenLabs Agent calls this when it needs fresh facts.
// Request body: { query: string } — populated by the LLM from conversation context.
// Response: { answer, sources } — stringified and fed back to the LLM.
tavilyRouter.post('/', async (req, res) => {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return res.status(500).json({ error: 'TAVILY_API_KEY missing' });

  const query: string | undefined = req.body?.query;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query required (string)' });
  }

  try {
    console.log('[tavily] query:', query);
    const client = tavily({ apiKey: key });
    const result = await client.search(query, {
      includeAnswer: 'advanced',
      maxResults: 5,
      searchDepth: 'basic',
    });
    const sources = (result.results ?? []).slice(0, 5).map((r) => ({
      title: r.title,
      url: r.url,
    }));
    res.json({
      answer: result.answer ?? '',
      sources,
    });
  } catch (err) {
    console.error('[tavily] search failed', err);
    res.status(500).json({ error: 'tavily search failed', detail: String(err) });
  }
});
