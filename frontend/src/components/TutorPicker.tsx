import { IllustratedCharacter } from './IllustratedCharacter';

const ANN_PREVIEW_URL =
  'https://files2.heygen.ai/avatar/v3/75e0a87b7fd94f0981ff398b593dd47f_45570/preview_talk_4.webp';

export type TutorKey = 'alex' | 'ann';

type Tutor = {
  key: TutorKey;
  name: string;
};

const TUTORS: Tutor[] = [
  { key: 'alex', name: 'Alex' },
  { key: 'ann', name: 'Ann' },
];

type Props = {
  onPick: (tutor: TutorKey) => void;
};

export function TutorPicker({ onPick }: Props) {
  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-sky-300/70 font-medium">
          Choose your tutor
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {TUTORS.map((t) => (
          <button
            key={t.key}
            onClick={() => onPick(t.key)}
            className="group relative rounded-3xl overflow-hidden border border-white/10 hover:border-sky-300/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-left"
          >
            <div className="aspect-video relative">
              {t.key === 'alex' ? (
                <IllustratedCharacter role="tutor" />
              ) : (
                <>
                  <img src={ANN_PREVIEW_URL} alt={t.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </>
              )}
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="text-base font-semibold text-neutral-100">{t.name}</div>
              <div className="text-xs text-neutral-500 group-hover:text-neutral-100 transition-colors">
                Choose →
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
