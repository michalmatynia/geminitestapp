import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
} from '@/features/kangur/ui/design/primitives';

type SectionId = 'podstawy' | 'game' | 'synthesis';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  podstawy: [
    {
      title: 'Dodawanie to laczenie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Dodawanie to laczenie dwoch grup w jedna calosc.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-sm text-center'>
            <KangurDisplayEmoji size='sm'>🍎🍎 + 🍎 = 🍎🍎🍎</KangurDisplayEmoji>
            <KangurLessonCaption className='mt-2'>Policz wszystko razem.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Dodawanie jednocyfrowe',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Dodawanie jednocyfrowe.</KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-sm text-center'>
            <KangurEquationDisplay
              accent='amber'
              data-testid='adding-lesson-single-digit-equation'
              size='lg'
            >
              3 + 2 = 5
            </KangurEquationDisplay>
          </KangurLessonCallout>
          <KangurLessonLead>Zacznij od większej liczby, potem dodaj mniejszą.</KangurLessonLead>
        </KangurLessonStack>
      ),
    },
  ],
  game: [],
  synthesis: [],
};

export const HUB_SECTIONS = [
  {
    id: 'podstawy',
    emoji: '➕',
    title: 'Podstawy dodawania',
    description: 'Sumy do 10 i 20',
    slideCount: SLIDES.podstawy.length,
  },
  {
    id: 'game',
    emoji: '⚽',
    title: 'Gra z piłkami',
    description: 'Szybkie dodawanie w ruchu',
    isGame: true,
    slideCount: 0,
  },
  {
    id: 'synthesis',
    emoji: '🧩',
    title: 'Synteza dodawania',
    description: 'Czterotorowa plansza z sumami',
    isGame: true,
    slideCount: 0,
  },
];
