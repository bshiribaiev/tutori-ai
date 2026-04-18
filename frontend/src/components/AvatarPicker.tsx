import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

type Avatar = {
  id: string;
  name: string;
  preview_url?: string;
  default_voice?: { id: string; name: string };
};

/** Full-screen dev tool: visit /?picker=1 to browse all 83 LiveAvatar public avatars. */
export function AvatarPicker() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/session/avatars`)
      .then((r) => r.json())
      .then((d) => setAvatars(d.avatars ?? []))
      .catch(() => setAvatars([]));
  }, []);

  const filtered = avatars.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="min-h-screen bg-field p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-xl font-semibold text-neutral-100">LiveAvatar Picker</h1>
          <div className="text-xs text-neutral-500">{filtered.length} of {avatars.length}</div>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="filter by name…"
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-100 outline-none focus:border-white/25 mb-5 text-sm"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => copyId(a.id)}
              className="group text-left rounded-2xl overflow-hidden border border-white/10 hover:border-sky-400/60 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
            >
              <div className="aspect-video bg-neutral-900 overflow-hidden">
                {a.preview_url ? (
                  <img src={a.preview_url} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">no preview</div>
                )}
              </div>
              <div className="p-3 space-y-1">
                <div className="text-sm font-medium text-neutral-100 truncate">{a.name}</div>
                <div className="text-[10px] text-neutral-500 font-mono truncate">{a.id}</div>
                {copied === a.id && (
                  <div className="text-[10px] text-emerald-300">✓ copied</div>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-8 text-xs text-neutral-500 text-center">
          Click any avatar to copy its UUID to your clipboard, then paste into backend/.env as HEYGEN_AVATAR_ID.
        </div>
      </div>
    </div>
  );
}
