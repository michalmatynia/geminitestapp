import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'config' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'React Compiler w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            React Compiler automatycznie optymalizuje renderowanie, redukując potrzebę ręcznego
            memoizowania. Zaczynamy od bezpiecznej konfiguracji.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Celem jest mądre przyspieszenie UI bez zmiany zachowania aplikacji.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  config: [
    {
      title: 'Konfiguracja krok po kroku',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najpierw włącz kompilator w trybie kontrolowanym, a potem obserwuj wpływ na
            renderowanie i stabilność.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Włącz kompilator tylko dla wybranego zakresu.</li>
              <li>Monitoruj kluczowe widoki i wydajność.</li>
              <li>Stopniowo rozszerzaj zasięg.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach przejdziemy przez praktyczne przykłady konfiguracji.
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
            React Compiler Configuration pomaga uporządkować optymalizację.
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
    emoji: '🛠️',
    title: 'React Compiler Configuration Basics',
    description: 'Wprowadzenie do kompilatora React',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'config',
    emoji: '⚙️',
    title: 'Konfiguracja',
    description: 'Kontrolowane wdrożenie i obserwacja',
    slideCount: SLIDES.config.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
