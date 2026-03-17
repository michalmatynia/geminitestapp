import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'wstep' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  wstep: [
    {
      title: 'Analogia',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>A : B = C : D</KangurLessonLead>
          <KangurLessonCaption>„A do B tak jak C do D"</KangurLessonCaption>
          <KangurLessonCaption>Relacja: stworzenie</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Szukaj tej samej relacji w nowym zestawie.</KangurLessonLead>
          <KangurLessonCaption>
            Gdy znajdziesz schemat, analogia staje się prosta.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'wstep',
    emoji: '🔗',
    title: 'Analogia: wstęp',
    description: 'Porównuj relacje między pojęciami',
    slideCount: SLIDES.wstep.length,
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.podsumowanie.length,
  },
];
