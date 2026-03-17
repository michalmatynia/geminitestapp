import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
} from '@/features/kangur/ui/design/primitives';

type SectionId = 'intro' | 'tabliczka' | 'summary' | 'game';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to mnozenie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Mnozenie to dodawanie takich samych grup.</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='max-w-sm text-center'>
            <KangurDisplayEmoji size='sm'>🍇🍇🍇</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='violet'
              data-testid='multiplication-lesson-intro-equation'
              size='md'
            >
              3 × 2 = 6
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>Trzy takie same porcje.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  tabliczka: [
    {
      title: 'Tabliczka mnozenia',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Najpierw cwiczymy male tabliczki.</KangurLessonLead>
          <div className='flex flex-wrap justify-center gap-2'>
            <KangurLessonChip accent='violet'>× 2</KangurLessonChip>
            <KangurLessonChip accent='violet'>× 3</KangurLessonChip>
            <KangurLessonChip accent='violet'>× 4</KangurLessonChip>
          </div>
          <KangurLessonCaption>
            Zaczynaj od malych grup i powtarzaj kilka razy.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Mnozenie to szybsze dodawanie.</KangurLessonLead>
          <KangurLessonCaption>
            Im czesciej cwiczysz, tym latwiej zapamietasz wyniki.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  game: [],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '✖️',
    title: 'Co to mnożenie',
    description: 'Powtarzane grupy i szybkie sumy',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'tabliczka',
    emoji: '🧮',
    title: 'Tabliczka × 2 i × 3',
    description: 'Najprostsze tabliczki',
    slideCount: SLIDES.tabliczka.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najwazniejsze wskazowki',
    slideCount: SLIDES.summary.length,
  },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Gra z grupami',
    description: 'Uloz grupy i policz wynik',
    isGame: true,
    slideCount: 0,
  },
];
