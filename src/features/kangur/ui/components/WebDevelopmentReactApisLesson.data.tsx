'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'toolbox' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'React APIs w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            API Reacta to zestaw funkcji i narzędzi, które pomagają współdzielić dane,
            optymalizować render i integrować się z DOM.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Przykłady: <strong>createContext</strong>, <strong>memo</strong>,
            <strong> forwardRef</strong>, <strong>lazy</strong>.
          </KangurLessonCaption>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              createContext
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`import { createContext } from 'react';

const ThemeContext = createContext('light');`}</code>
            </pre>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  toolbox: [
    {
      title: 'Skrzynka narzędzi',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            API porządkujemy według problemów, które rozwiązują. Dzięki temu łatwiej
            dobrać właściwe narzędzie.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Kategorie</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Współdzielenie danych: createContext.</li>
              <li>Wydajność: memo, startTransition.</li>
              <li>Integracja z DOM: forwardRef, useImperativeHandle.</li>
              <li>Ładowanie kodu: lazy.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach rozbijemy każdą kategorię na praktyczne przykłady.
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
          <KangurLessonLead>API Reacta to narzędzia do danych, wydajności i DOM.</KangurLessonLead>
          <KangurLessonCaption>
            Masz już mapę — teraz czas na praktyczne użycie.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🔌',
    title: 'APIs Basics',
    description: 'Wprowadzenie do API Reacta',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'toolbox',
    emoji: '🧰',
    title: 'Narzędzia',
    description: 'Kategorie i przykłady API',
    slideCount: SLIDES.toolbox.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
