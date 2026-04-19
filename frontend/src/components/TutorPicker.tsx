import { IllustratedCharacter } from './IllustratedCharacter';

export type TutorKey = 'alex' | 'math' | 'history' | 'interview' | 'english';

type Tutor = {
  key: TutorKey;
  name: string;
  specialty: string;
  kind: 'illustrated' | 'heygen';
  previewUrl?: string;
};

const TUTORS: Tutor[] = [
  { key: 'alex', name: 'Alex', specialty: 'Generalist', kind: 'illustrated' },
  {
    key: 'math',
    name: 'Ann',
    specialty: 'Math',
    kind: 'heygen',
    previewUrl: 'https://files2.heygen.ai/avatar/v3/75e0a87b7fd94f0981ff398b593dd47f_45570/preview_talk_4.webp',
  },
  {
    key: 'history',
    name: 'Shawn',
    specialty: 'History',
    kind: 'heygen',
    previewUrl: 'https://files2.heygen.ai/avatar/v3/db2fb7fd0d044b908395a011166ab22d_45680/preview_target.webp',
  },
  {
    key: 'interview',
    name: 'Katya',
    specialty: 'Interview Coach',
    kind: 'heygen',
    previewUrl: 'https://files2.heygen.ai/avatar/v3/b1ff5edbf96242e6ac9469227df40924_55360/preview_target.webp',
  },
  {
    key: 'english',
    name: 'Graham',
    specialty: 'English',
    kind: 'heygen',
    previewUrl: 'https://files2.heygen.ai/avatar/v3/2146e2c8c07045c0b3598683d4473fdd_55340/preview_target.webp',
  },
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {TUTORS.map((t) => (
          <button
            key={t.key}
            onClick={() => onPick(t.key)}
            className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-sky-300/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-left"
          >
            <div className="aspect-[4/5] relative">
              {t.kind === 'illustrated' ? (
                <IllustratedCharacter role="tutor" fill />
              ) : (
                <>
                  <img src={t.previewUrl} alt={t.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </>
              )}
            </div>
            <div className="px-4 py-3">
              <div className="text-sm font-semibold text-neutral-100">{t.name}</div>
              <div className="text-xs text-neutral-500 group-hover:text-sky-300 transition-colors">
                {t.specialty}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
