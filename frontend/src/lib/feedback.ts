const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

export type Feedback = {
  overall_score: number;
  summary: string;
  correct: string[];
  needs_clarification: string[];
  incorrect: { claim: string; correction: string }[];
  sources: { title: string; url: string }[];
};

export async function fetchFeedback(transcript: { role: 'user' | 'agent'; text: string }[]): Promise<Feedback> {
  const res = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) throw new Error(`feedback ${res.status}: ${await res.text()}`);
  return res.json();
}
