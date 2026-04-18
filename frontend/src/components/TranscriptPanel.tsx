import type { TranscriptEntry } from '../App';

type Props = {
  entries: TranscriptEntry[];
};

export function TranscriptPanel({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-1">
          <div className="text-sm text-neutral-400">No turns yet</div>
          <div className="text-xs text-neutral-600">Tap the mic or pick a prompt below</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-subtle px-5 py-4 space-y-4">
      {entries.map((e, i) => (
        <Turn key={i} entry={e} />
      ))}
    </div>
  );
}

function Turn({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.role === 'user';
  return (
    <div className="space-y-1.5">
      <div className={'text-[10px] uppercase tracking-widest font-medium ' + (isUser ? 'text-emerald-400/80' : 'text-sky-300/80')}>
        {isUser ? 'You' : 'Tutor'}
      </div>
      <div className="text-sm text-neutral-100 leading-relaxed">{entry.text}</div>
      {entry.sources && entry.sources.length > 0 && (
        <ul className="pt-1 space-y-1">
          {entry.sources.map((s, j) => (
            <li key={j} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-neutral-600" />
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-neutral-400 hover:text-neutral-100 truncate underline decoration-neutral-700 underline-offset-2"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
