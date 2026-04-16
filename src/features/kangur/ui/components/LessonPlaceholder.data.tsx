import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type PlaceholderSectionId = 'summary';

type PlaceholderLessonData = {
  HUB_SECTIONS: readonly {
    id: PlaceholderSectionId;
    emoji: string;
    title: string;
    description: string;
    slideCount: number;
  }[];
  SLIDES: Record<PlaceholderSectionId, LessonSlide[]>;
};

export const createPlaceholderLessonData = (
  lessonTitle: string,
  emoji = '📘'
): PlaceholderLessonData => {
  const SLIDES: Record<PlaceholderSectionId, LessonSlide[]> = {
    summary: [
      {
        title: 'W przygotowaniu',
        content: (
          <KangurLessonStack>
            <KangurLessonLead>Ta lekcja jest w przygotowaniu.</KangurLessonLead>
            <KangurLessonCaption>
              {lessonTitle} pojawi się wkrótce. W międzyczasie sprawdź inne lekcje.
            </KangurLessonCaption>
          </KangurLessonStack>
        ),
      },
    ],
  };

  const HUB_SECTIONS = [
    {
      id: 'summary',
      emoji,
      title: 'W przygotowaniu',
      description: `${lessonTitle} pojawi się wkrótce.`,
      slideCount: SLIDES.summary.length,
    },
  ] as const;

  return { HUB_SECTIONS, SLIDES } as const;
};
