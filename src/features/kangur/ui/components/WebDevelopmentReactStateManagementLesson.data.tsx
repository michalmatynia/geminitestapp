import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'patterns' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Managing State w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Zarządzanie stanem to sposób na kontrolowanie danych, które wpływają na UI.
            Zaczynamy od prostych przypadków, zanim sięgniemy po większe narzędzia.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Najpierw uczymy się trzymać stan blisko komponentu.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  patterns: [
    {
      title: 'Najczęstsze wzorce',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Wybór wzorca zależy od skali aplikacji i potrzeb współdzielenia danych.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>${'use' + 'State'} dla lokalnego stanu.</li>
              <li>Context dla współdzielonych danych.</li>
              <li>Reducer dla złożonej logiki.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy, kiedy używać każdego z nich.
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
            Managing State to fundament przewidywalnych aplikacji React.
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
    emoji: '🗃️',
    title: 'Managing State Basics',
    description: 'Wprowadzenie do zarządzania stanem',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'patterns',
    emoji: '🧩',
    title: 'Wzorce',
    description: 'Najczęstsze podejścia',
    slideCount: SLIDES.patterns.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
