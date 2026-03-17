import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'boki' | 'podsumowanie' | 'game';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  boki: [
    {
      title: 'Boki i rogi',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Koło</KangurLessonLead>
          <KangurLessonCaption>0 boków i 0 rogów</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Wielokąty',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Kwadrat ma 4 boki.</KangurLessonLead>
          <KangurLessonCaption>
            Trójkąt ma 3 boki i 3 rogi.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Figury mogą mieć różną liczbę boków.</KangurLessonLead>
          <KangurLessonCaption>
            Warto zapamiętać koło i wielokąty.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  game: [],
};

export const HUB_SECTIONS = [
  {
    id: 'boki',
    emoji: '🔷',
    title: 'Boki i rogi',
    description: 'Policz boki i rogi figur',
    slideCount: SLIDES.boki.length,
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze informacje',
    slideCount: SLIDES.podsumowanie.length,
  },
  {
    id: 'game',
    emoji: '✏️',
    title: 'Rysuj figury',
    description: 'Narysuj kształty w grze',
    isGame: true,
    slideCount: 0,
  },
];
