import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurEquationDisplay } from '@/features/kangur/ui/design/primitives';

type SectionId = 'podstawy' | 'game';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  podstawy: [
    {
      title: 'Odejmowanie to cofanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Odejmowanie to cofanie się o kilka kroków.
          </KangurLessonLead>
          <KangurLessonCaption>
            Gdy odejmujesz, liczysz wstecz.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Oś liczbowa',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Cofaj się na osi liczbowej.</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='max-w-sm text-center'>
            <KangurEquationDisplay
              accent='rose'
              data-testid='subtracting-lesson-single-digit-equation'
              size='lg'
            >
              8 − 3 = 5
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              Zacznij od 8 i cofnij się o 3.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCaption>
            Każdy krok w lewo to minus jeden.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  game: [],
};

export const HUB_SECTIONS = [
  {
    id: 'podstawy',
    emoji: '➖',
    title: 'Podstawy odejmowania',
    description: 'Cofanie na osi liczbowej',
    slideCount: SLIDES.podstawy.length,
  },
  {
    id: 'game',
    emoji: '🌿',
    title: 'Gra z odejmowaniem',
    description: 'Odejmuj w ogrodzie',
    isGame: true,
    slideCount: 0,
  },
];
