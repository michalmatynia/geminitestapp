import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCaption, KangurLessonLead, KangurLessonStack } from '@/features/kangur/ui/design/lesson-primitives';

export const summarySlides: LessonSlide[] = [
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
];
