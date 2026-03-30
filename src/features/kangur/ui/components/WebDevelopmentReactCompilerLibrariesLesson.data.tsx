import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'integration' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'React Compiler Libraries w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Biblioteki wspierające kompilator pomagają integrować go z toolingiem i
            workflow zespołu. To ważne przy większych projektach.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Skupiamy się na tym, jak bezpiecznie wdrażać kompilator w istniejącym stacku.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  integration: [
    {
      title: 'Integracje i narzędzia',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Uporządkuj integracje: budowanie, linting i monitoring po wdrożeniu.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Sprawdź kompatybilność bundlera i środowiska.</li>
              <li>Dodaj testy regresji wydajności.</li>
              <li>Komunikuj zmiany w zespole.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy konkretne przykłady integracji.
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
            React Compiler Libraries pomagają wdrożyć optymalizacje w skali.
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
    emoji: '📚',
    title: 'React Compiler Libraries Basics',
    description: 'Wprowadzenie do bibliotek kompilatora',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'integration',
    emoji: '🔗',
    title: 'Integracje',
    description: 'Tooling i wdrożenie',
    slideCount: SLIDES.integration.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
