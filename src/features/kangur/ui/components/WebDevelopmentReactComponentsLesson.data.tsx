import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'components' | 'composition' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  components: [
    {
      title: 'Components',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Komponenty to podstawowy blok budulcowy Reacta.</KangurLessonLead>
          <KangurLessonCaption>
            Wkrótce pojawią się tu pierwsze przykłady i krótkie ćwiczenia.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  composition: [
    {
      title: 'Kompozycja i propsy',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Składaj UI z mniejszych, przewidywalnych części.</KangurLessonLead>
          <KangurLessonCaption>
            Materiały o kompozycji pojawią się tu w kolejnych iteracjach.
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
          <KangurLessonLead>Wracamy do podstaw Reacta.</KangurLessonLead>
          <KangurLessonCaption>
            Kompletne ćwiczenia będą dostępne wkrótce.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'components',
    emoji: '⚛️',
    title: 'Components',
    description: 'Podstawy budowania komponentów',
    slideCount: SLIDES.components.length,
  },
  {
    id: 'composition',
    emoji: '🧱',
    title: 'Kompozycja i propsy',
    description: 'Składanie interfejsu z mniejszych części',
    slideCount: SLIDES.composition.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
