import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

import KangurMusicPianoRoll from '@/features/kangur/ui/components/music/KangurMusicPianoRoll';
import {
  DIATONIC_PIANO_KEYS,
  DIATONIC_SCALE_ASCENDING,
} from '@/features/kangur/ui/components/music/music-theory';

type SectionId = 'notes' | 'melody' | 'game_repeat' | 'game_freeplay' | 'summary';
type SlideSectionId = Exclude<SectionId, 'game_repeat' | 'game_freeplay'>;

const NOTE_SEQUENCE = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do'] as const;
const PREVIEW_PIANO_ROLL = [
  { noteId: 'do', span: 2 },
  { noteId: 're', span: 1 },
  { noteId: 'mi', span: 1 },
  { noteId: 'fa', span: 1 },
  { noteId: 'sol', span: 2 },
  { noteId: 'la', span: 1 },
  { noteId: 'si', span: 1 },
  { label: 'DO+', noteId: 'high_do', span: 3 },
] as const;

export const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  notes: [
    {
      title: 'Poznaj dzwieki skali',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Skala diatoniczna to porzadek siedmiu dzwiekow. Spiewamy je po kolei, aby uslyszec,
            jak melodia wspina sie stopien po stopniu.
          </KangurLessonLead>
          <div className='grid w-full gap-3 sm:grid-cols-4'>
            {NOTE_SEQUENCE.map((note, index) => (
              <div
                key={`${note}-${index}`}
                className='rounded-[24px] border border-sky-200 bg-white/90 px-4 py-3 text-center shadow-sm'
              >
                <div className='text-xs font-semibold uppercase tracking-[0.24em] text-sky-500'>
                  Dzwiek
                </div>
                <div className='mt-2 text-2xl font-black tracking-tight text-sky-950'>{note}</div>
              </div>
            ))}
          </div>
          <KangurLessonCaption align='left'>
            Mozesz klasnac przy kazdym dzwieku, zeby latwiej zapamietac kolejnosc.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kolory pomagaja zapamietac melodie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            W tej lekcji kazdy dzwiek ma swoj kolor. Kiedy melodia gra, zobaczysz ten sam kolor
            na piano rollu i na klawiaturze.
          </KangurLessonLead>
          <div className='flex flex-wrap gap-2'>
            {DIATONIC_SCALE_ASCENDING.map((noteId) => {
              const note = DIATONIC_PIANO_KEYS.find((candidate) => candidate.id === noteId);
              if (!note) {
                return null;
              }

              return (
                <KangurLessonChip key={note.id} accent='sky'>
                  {note.label}
                </KangurLessonChip>
              );
            })}
          </div>
          <KangurMusicPianoRoll
            completedStepCount={0}
            description='Na gorze dzwieki ukladaja sie na wysokosciach jak prawdziwy piano roll, a na dole czekaja te same kolory na klawiaturze.'
            disabled
            interactive={false}
            keys={DIATONIC_PIANO_KEYS}
            melody={PREVIEW_PIANO_ROLL}
            shellTestId='music-diatonic-scale-preview-roll'
            title='Podglad piano rollu'
            visualCueMode='six_year_old'
          />
          <KangurLessonCaption align='left'>
            W grze najpierw posluchasz melodii, a potem szybko odtworzysz ja tymi samymi
            kolorami.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  melody: [
    {
      title: 'W gore i w dol',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kiedy spiewasz od do do kolejnego do, melodia idzie w gore. Gdy wracasz od wysokiego
            do na dol, melodia schodzi.
          </KangurLessonLead>
          <div className='grid w-full gap-3 sm:grid-cols-2'>
            <div className='rounded-[26px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-left'>
              <div className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600'>
                W gore
              </div>
              <div className='mt-2 text-lg font-bold text-emerald-950'>do re mi fa sol</div>
              <KangurLessonCaption align='left' className='mt-2'>
                Kazdy kolejny dzwiek brzmi wyzej niz poprzedni.
              </KangurLessonCaption>
            </div>
            <div className='rounded-[26px] border border-amber-200 bg-amber-50 px-5 py-4 text-left'>
              <div className='text-xs font-semibold uppercase tracking-[0.24em] text-amber-600'>
                W dol
              </div>
              <div className='mt-2 text-lg font-bold text-amber-950'>sol fa mi re do</div>
              <KangurLessonCaption align='left' className='mt-2'>
                Kazdy kolejny dzwiek opada i prowadzi melodie nizej.
              </KangurLessonCaption>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Najpierw sluchaj, potem dotykaj',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy chcesz powtorzyc melodie, nie spiesz sie od razu. Najpierw posluchaj calej
            sciezki, a potem podazaj za kolorami od pierwszego dzwieku.
          </KangurLessonLead>
          <div className='rounded-[28px] bg-slate-900 px-5 py-5 text-left text-slate-50'>
            <div className='text-xs font-semibold uppercase tracking-[0.24em] text-sky-300'>
              Szybki plan
            </div>
            <div className='mt-3 flex flex-wrap gap-2'>
              <KangurLessonChip accent='sky'>1. sluchaj</KangurLessonChip>
              <KangurLessonChip accent='violet'>2. patrz na kolory</KangurLessonChip>
              <KangurLessonChip accent='emerald'>3. powtorz po kolei</KangurLessonChip>
            </div>
            <KangurLessonCaption align='left' className='mt-3 text-slate-200'>
              Jesli sie zgubisz, odsluchaj melodie jeszcze raz i zacznij od pierwszego koloru.
            </KangurLessonCaption>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Zapamietaj',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Skala diatoniczna ma siedem roznych dzwiekow i wraca do nastepnego do.
          </KangurLessonLead>
          <div className='grid w-full gap-3 sm:grid-cols-3'>
            <div className='rounded-[24px] bg-white/90 px-4 py-4 text-left shadow-sm'>
              <div className='text-sm font-bold text-sky-950'>Kolejnosc</div>
              <KangurLessonCaption align='left' className='mt-2'>
                do, re, mi, fa, sol, la, si, do
              </KangurLessonCaption>
            </div>
            <div className='rounded-[24px] bg-white/90 px-4 py-4 text-left shadow-sm'>
              <div className='text-sm font-bold text-sky-950'>Kolory</div>
              <KangurLessonCaption align='left' className='mt-2'>
                Kazdy dzwiek moze miec swoj kolor na klawiaturze.
              </KangurLessonCaption>
            </div>
            <div className='rounded-[24px] bg-white/90 px-4 py-4 text-left shadow-sm'>
              <div className='text-sm font-bold text-sky-950'>Cwiczenie</div>
              <KangurLessonCaption align='left' className='mt-2'>
                Posluchaj melodii, a potem odtworz ja po kolei na piano rollu.
              </KangurLessonCaption>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'notes',
    emoji: '🎼',
    title: 'Dzwieki',
    description: 'Poznaj kolejnosc dzwiekow i kolory klawiszy.',
    slideCount: SLIDES.notes.length,
  },
  {
    id: 'melody',
    emoji: '🎶',
    title: 'Melodia',
    description: 'Uslysz, jak skala idzie w gore i w dol.',
    slideCount: SLIDES.melody.length,
  },
  {
    id: 'game_repeat',
    emoji: '🎹',
    title: 'Powtorz melodie',
    description: 'Najpierw posluchaj, potem zagraj te same kolory.',
    isGame: true,
  },
  {
    id: 'game_freeplay',
    emoji: '🎛️',
    title: 'Swobodna gra',
    description: 'Graj na piano rollu bez zadania i sprawdzaj rozne brzmienia.',
    isGame: true,
  },
  {
    id: 'summary',
    emoji: '⭐',
    title: 'Powtorka',
    description: 'Zbierz najwazniejsze elementy skali diatonicznej.',
    slideCount: SLIDES.summary.length,
  },
] as const;
