import { useEffect } from 'react';
import { TranscriptPanel } from './TranscriptPanel';
import type { TranscriptEntry } from '../App';

type Props = {
  open: boolean;
  onClose: () => void;
  entries: TranscriptEntry[];
};

export function TranscriptDrawer({ open, onClose, entries }: Props) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={
          'fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ' +
          (open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')
        }
      />
      <aside
        className={
          'fixed right-0 top-0 bottom-0 w-full max-w-md z-40 glass border-l border-white/10 flex flex-col transition-transform duration-300 ease-out ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="text-xs uppercase tracking-widest text-neutral-400">Transcript</div>
            <div className="text-[10px] text-neutral-600 tabular-nums">
              {entries.length} turn{entries.length === 1 ? '' : 's'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-200 text-xs"
            aria-label="close transcript"
          >
            ✕
          </button>
        </div>
        <TranscriptPanel entries={entries} />
      </aside>
    </>
  );
}
