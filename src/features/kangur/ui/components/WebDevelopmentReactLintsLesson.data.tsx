import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'rules' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Lint w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Linting pomaga wyłapywać błędy i niespójności zanim trafią do produkcji.
            To szybki feedback dla zespołu.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            W React szczególnie ważne są zasady dla hooków i zależności Effectów.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  rules: [
    {
      title: 'Najważniejsze reguły',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Skup się na regułach, które wpływają na stabilność renderu i poprawność logiki.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Rules of Hooks.</li>
              <li>Exhaustive deps w useEffect.</li>
              <li>Unikanie nieużywanego kodu.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy, jak rozwiązywać typowe ostrzeżenia.
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
          <KangurLessonLead>
            Lint to codzienne wsparcie jakości w React.
          </KangurLessonLead>
          <KangurLessonCaption>
            Masz bazę — czas na praktyczne scenariusze.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🧹',
    title: 'Lint Basics',
    description: 'Wprowadzenie do lintingu',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'rules',
    emoji: '✅',
    title: 'Reguły',
    description: 'Najważniejsze zasady',
    slideCount: SLIDES.rules.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
