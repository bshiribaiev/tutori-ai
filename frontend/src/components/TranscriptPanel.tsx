import type { TranscriptEntry } from '../App';

type Props = {
  entries: TranscriptEntry[];
};

export function TranscriptPanel({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-2 max-w-xs">
          <div className="text-sm text-neutral-300">No turns yet</div>
          <div className="text-xs text-neutral-500 leading-relaxed">
            Start a session, then speak, type, or tap a suggested prompt.
            Your tutor will grounded-search when facts matter.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-subtle px-4 py-4 space-y-3">
      {entries.map((e, i) => (
        <Turn key={i} entry={e} />
      ))}
    </div>
  );
}

function Turn({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.role === 'user';
  return (
    <div className={'flex ' + (isUser ? 'justify-end' : 'justify-start')}>
      <div className={'max-w-[85%] space-y-2 ' + (isUser ? 'items-end' : 'items-start')}>
        <div
          className={
            'text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl ' +
            (isUser
              ? 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-50 rounded-br-sm'
              : 'bg-white/[0.04] border border-white/10 text-neutral-100 rounded-bl-sm')
          }
        >
          {entry.text}
        </div>
        {entry.sources && entry.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {entry.sources.map((s, j) => (
              <a
                key={j}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                title={s.title}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-400 hover:text-neutral-100 transition-colors truncate max-w-[180px]"
              >
                {hostOf(s.url)}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
