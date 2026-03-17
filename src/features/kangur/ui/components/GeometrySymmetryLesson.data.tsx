import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'os' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  os: [
    {
      title: 'Oś symetrii',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Oś symetrii to linia dzieląca figurę na dwie równe części.</KangurLessonLead>
          <KangurLessonCaption>pionowa kreska to oś symetrii</KangurLessonCaption>
          <KangurLessonCaption>figura może mieć więcej niż jedną oś symetrii</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Sprawdzaj, czy po złożeniu figury połowy pasują.</KangurLessonLead>
          <KangurLessonCaption>Tak znajdziesz osie symetrii.</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'os',
    emoji: '🪞',
    title: 'Oś symetrii',
    description: 'Linia, która dzieli figurę na dwie równe części',
    slideCount: SLIDES.os.length,
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.podsumowanie.length,
  },
];
