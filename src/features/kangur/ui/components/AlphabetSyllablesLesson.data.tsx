import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'sylaby' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  sylaby: [
    {
      title: 'Sylaby',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Rozbij słowo na sylaby.</KangurLessonLead>
          <KangurLessonCaption>
            MA-MA, TA-TA — tak łatwiej przeczytać słowo.
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
          <KangurLessonLead>Umiesz dzielić słowa na sylaby.</KangurLessonLead>
          <KangurLessonCaption>
            Ćwicz na krótkich wyrazach, a potem na dłuższych.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'sylaby',
    emoji: '🔤',
    title: 'Sylaby i słowa',
    description: 'Dziel wyrazy na sylaby',
    slideCount: SLIDES.sylaby.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
