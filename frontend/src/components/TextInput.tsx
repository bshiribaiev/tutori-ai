import { useState } from 'react';

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
};

export function TextInput({ disabled, onSend }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <div
      className={
        'flex items-center gap-2 px-4 py-2 rounded-2xl border transition-colors ' +
        (disabled
          ? 'bg-neutral-900/40 border-white/5'
          : 'bg-white/5 border-white/10 focus-within:border-white/25 focus-within:bg-white/[0.07]')
      }
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        disabled={disabled}
        placeholder={disabled ? 'Start a session to ask in text' : 'Or type a question…'}
        className="flex-1 bg-transparent outline-none text-sm text-neutral-100 placeholder:text-neutral-500 disabled:cursor-not-allowed"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className={
          'text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ' +
          (disabled || !value.trim()
            ? 'text-neutral-600 cursor-not-allowed'
            : 'text-sky-300 hover:text-sky-200 bg-sky-300/10 hover:bg-sky-300/20')
        }
      >
        send
      </button>
    </div>
  );
}
