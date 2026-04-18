const PROMPTS = [
  'Explain quantum entanglement simply',
  "What's happening in AI research this week?",
  'Teach me the basics of calculus',
  'Why is the sky blue?',
];

type Props = {
  disabled?: boolean;
  onPick: (prompt: string) => void;
};

export function SuggestedPrompts({ disabled, onPick }: Props) {
  return (
    <div className="w-full max-w-3xl">
      <div className="text-[10px] uppercase tracking-widest text-neutral-600 mb-3 text-center">
        Try asking
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            disabled={disabled}
            onClick={() => onPick(p)}
            className={
              'text-left text-sm px-4 py-3 rounded-xl border transition-all ' +
              (disabled
                ? 'bg-neutral-900/40 border-white/5 text-neutral-600 cursor-not-allowed'
                : 'bg-white/[0.03] border-white/10 text-neutral-200 hover:bg-white/[0.07] hover:border-white/20 hover:text-white')
            }
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
