import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'routes' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'React Router w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            React Router pozwala definiować strony i nawigację w aplikacjach SPA.
            To fundament większych aplikacji.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Zaczynamy od podstaw: definicja tras i linków.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  routes: [
    {
      title: 'Definicja tras',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Trasy mapują adresy URL na widoki. Dzięki temu użytkownik wie, gdzie jest w aplikacji.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              Routes
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/profile" element={<Profile />} />
</Routes>`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy nawigację, zagnieżdżone trasy i ładowanie danych.
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
            React Router to podstawowy system nawigacji w aplikacjach React.
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
    title: 'React Router Basics',
    description: 'Wprowadzenie do routingu',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'routes',
    emoji: '🗺️',
    title: 'Trasy',
    description: 'Definiowanie ścieżek',
    slideCount: SLIDES.routes.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
