// Local dev entrypoint. On Vercel, api/[...slug].ts is the entry.
import app from './app.js';

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`[backend] listening on :${PORT}`);
});
