import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
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
      title: 'React Compiler Directives w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dyrektywy kompilatora pozwalają kontrolować, które fragmenty kodu są
            optymalizowane automatycznie.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            To narzędzie do świadomego zarządzania wydajnością i czytelnością kodu.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  directives: [
    {
      title: 'Jak myśleć o dyrektywach',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Używaj dyrektyw tam, gdzie potrzebujesz wyłączyć lub wymusić optymalizacje,
            np. przy integracji z kodem legacy.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Oznacz miejsca, które nie powinny być optymalizowane.</li>
              <li>Waliduj zachowanie po zmianie konfiguracji.</li>
              <li>Dokumentuj decyzje w zespole.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy konkretne scenariusze użycia dyrektyw.
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
            React Compiler Directives pomagają świadomie sterować optymalizacją.
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
    emoji: '📌',
    title: 'React Compiler Directives Basics',
    description: 'Wprowadzenie do dyrektyw kompilatora',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'directives',
    emoji: '🧭',
    title: 'Dyrektywy',
    description: 'Kontrola optymalizacji',
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
