import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'wprowadzenie' | 'wzorce' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  wprowadzenie: [
    {
      title: 'Wprowadzenie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Myślenie logiczne to umiejętność szukania zasad.</KangurLessonLead>
          <div className='text-left'>
            <p className='[color:var(--kangur-page-text)]'>
              <span>Logiczne myślenie pomaga:</span>
            </p>
            <ul className='mt-2 list-disc pl-5 text-sm [color:var(--kangur-page-text)]'>
              <li>porządkować informacje,</li>
              <li>rozwiązywać zagadki,</li>
              <li>szukać dobrych rozwiązań.</li>
            </ul>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  wzorce: [
    {
      title: 'Wzorce',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Wzorce to powtarzające się schematy.</KangurLessonLead>
          <KangurLessonCaption>
            Jeśli coś się powtarza, łatwiej przewidzieć, co będzie dalej.
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
          <KangurLessonLead>Logiczne myślenie ćwiczy się codziennie.</KangurLessonLead>
          <KangurLessonCaption>
            Patrz na zasady i szukaj kolejnych kroków.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'wprowadzenie',
    emoji: '🧠',
    title: 'Wprowadzenie',
    description: 'Czym jest myślenie logiczne',
    slideCount: SLIDES.wprowadzenie.length,
  },
  {
    id: 'wzorce',
    emoji: '🔍',
    title: 'Wzorce',
    description: 'Powtarzające się schematy',
    slideCount: SLIDES.wzorce.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
