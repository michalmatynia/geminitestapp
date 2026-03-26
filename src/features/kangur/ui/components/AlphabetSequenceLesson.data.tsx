import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'kolejnosc' | 'game_order' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  kolejnosc: [
    {
      title: 'Kolejność liter',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Ułóż litery w odpowiedniej kolejności.</KangurLessonLead>
          <KangurLessonCaption>
            A, B, C... — alfabet to stały rytm.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  game_order: [],
  summary: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Umiesz znaleźć brakującą literę.</KangurLessonLead>
          <KangurLessonCaption>
            Powtarzaj alfabet, a szybko zapamiętasz kolejność.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'kolejnosc',
    emoji: '🔡',
    title: 'Kolejność liter',
    description: 'Uzupełnij brakujące litery',
    slideCount: SLIDES.kolejnosc.length,
  },
  {
    id: 'game_order',
    emoji: '🎮',
    title: 'Gra alfabet',
    description: 'Uzupełnij brakujące litery w kolejności',
    isGame: true,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
