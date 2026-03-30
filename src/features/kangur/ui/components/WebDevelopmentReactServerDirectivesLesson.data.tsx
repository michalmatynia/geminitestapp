import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'directives' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Server Directives w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dyrektywy serwerowe pomagają oznaczać, co wykonuje się po stronie serwera,
            a co musi pozostać po stronie klienta.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            To kluczowe, gdy łączysz Server Components z akcjami serwerowymi.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  directives: [
    {
      title: 'Najważniejsze dyrektywy',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najczęściej spotkasz dyrektywy <strong>use server</strong> i <strong>use client</strong>.
            Pomagają one utrzymać jasny podział odpowiedzialności.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Oznacz pliki z akcjami po stronie serwera.</li>
              <li>Unikaj importowania API przeglądarki w kodzie serwera.</li>
              <li>Dbaj o granice między warstwami.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach przejdziemy przez praktyczne scenariusze dyrektyw.
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
            Server Directives pomagają pilnować granic w kodzie.
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
    emoji: '🧭',
    title: 'Server Directives Basics',
    description: 'Wprowadzenie do dyrektyw serwerowych',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'directives',
    emoji: '📌',
    title: 'Dyrektywy',
    description: 'use server i use client',
    slideCount: SLIDES.directives.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
