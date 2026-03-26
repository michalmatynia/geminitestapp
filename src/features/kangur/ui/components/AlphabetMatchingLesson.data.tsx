import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'dopasowanie' | 'game_pairs' | 'summary';

export const SLIDES: Record<Exclude<SectionId, 'game_pairs'>, LessonSlide[]> = {
  dopasowanie: [
    {
      title: 'Dopasuj litery',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Znajdź parę wielkiej i małej litery.</KangurLessonLead>
          <KangurLessonCaption>
            A pasuje do a, B do b, i tak dalej.
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
          <KangurLessonLead>Potrafisz dopasować litery!</KangurLessonLead>
          <KangurLessonCaption>
            Ćwicz codziennie, a zapamiętasz cały alfabet.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'dopasowanie',
    emoji: '🔤',
    title: 'Dopasuj litery',
    description: 'Łącz wielkie i małe litery',
    slideCount: SLIDES.dopasowanie.length,
  },
  {
    id: 'game_pairs',
    emoji: '🎮',
    title: 'Gra litery',
    description: 'Połącz wielkie i małe litery',
    isGame: true,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
] as const;
