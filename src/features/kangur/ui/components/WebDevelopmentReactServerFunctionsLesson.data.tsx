import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'actions' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Server Functions w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Server Functions pozwalają uruchamiać logikę po stronie serwera bezpośrednio
            z komponentów, zachowując bezpieczeństwo i wydajność.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Najczęściej używa się ich do obsługi formularzy i bezpiecznych operacji na danych.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  actions: [
    {
      title: 'Jak myśleć o akcjach',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Traktuj Server Functions jako warstwę, która waliduje dane i wykonuje
            krytyczne operacje poza klientem.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Waliduj dane wejściowe po stronie serwera.</li>
              <li>Obsługuj błędy i komunikaty zwrotne.</li>
              <li>Trzymaj logikę biznesową poza UI.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy konkretne implementacje akcji.
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
            Server Functions dają bezpieczny most między UI a logiką serwerową.
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
    emoji: '🧪',
    title: 'Server Functions Basics',
    description: 'Wprowadzenie do Server Functions',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'actions',
    emoji: '🔐',
    title: 'Akcje',
    description: 'Bezpieczne operacje na danych',
    slideCount: SLIDES.actions.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
