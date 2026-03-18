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
      title: 'Rules Of React w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Zasady Reacta pomagają pisać przewidywalny, wydajny kod i unikać
            trudnych do wykrycia błędów.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Skupiamy się na praktycznych regułach, które warto mieć zawsze z tyłu głowy.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  rules: [
    {
      title: 'Najważniejsze zasady',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Zasady dotyczą zarówno komponowania UI, jak i zachowania logiki.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Komponenty powinny być czyste i deterministyczne.</li>
              <li>Stan trzymaj jak najbliżej miejsca użycia.</li>
              <li>Komponuj UI z małych, czytelnych klocków.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy konkretne przykłady stosowania zasad.
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
            Rules Of React to zestaw dobrych praktyk dla stabilnego UI.
          </KangurLessonLead>
          <KangurLessonCaption>
            Masz bazę — czas na praktykę.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '📜',
    title: 'Rules Of React Basics',
    description: 'Wprowadzenie do zasad Reacta',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'rules',
    emoji: '✅',
    title: 'Zasady',
    description: 'Najważniejsze reguły',
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
