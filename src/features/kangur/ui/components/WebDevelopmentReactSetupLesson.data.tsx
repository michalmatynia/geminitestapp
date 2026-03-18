import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'tooling' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Setup w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Setup to pierwsze kroki: wybór narzędzi, struktury projektu i uruchomienie dev
            serwera. Dobre decyzje na starcie oszczędzają czas później.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Skupiamy się na podstawach, które ułatwią dalsze lekcje.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  tooling: [
    {
      title: 'Tooling i struktura',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Wybierz narzędzia, które pasują do skali projektu: bundler, testy, linting.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Konfiguracja dev servera.</li>
              <li>Struktura katalogów i aliasy importów.</li>
              <li>Podstawowy linting i formatowanie.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach przejdziemy przez konkretne ustawienia.
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
            Dobry setup to stabilna baza dla rozwoju aplikacji.
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
    emoji: '📦',
    title: 'Setup Basics',
    description: 'Wprowadzenie do konfiguracji',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'tooling',
    emoji: '🧰',
    title: 'Tooling',
    description: 'Narzędzia i struktura',
    slideCount: SLIDES.tooling.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
