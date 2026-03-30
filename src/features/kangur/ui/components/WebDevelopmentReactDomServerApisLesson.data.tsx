import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'streaming' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Server APIs w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Server API z <strong>react-dom/server</strong> służy do renderowania komponentów
            do HTML po stronie serwera.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Kluczowe funkcje: <strong>renderToString</strong>,
            <strong> renderToPipeableStream</strong>, <strong>renderToReadableStream</strong>.
          </KangurLessonCaption>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              renderToString
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`import { renderToString } from 'react-dom/server';

const html = renderToString(<App />);`}</code>
            </pre>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  streaming: [
    {
      title: 'Streaming i Suspense',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Streaming SSR pozwala wysyłać HTML w kawałkach i odsłaniać UI stopniowo,
            szczególnie gdy używasz <strong>Suspense</strong>.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Kiedy streaming?</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Gdy część danych ładuje się wolniej.</li>
              <li>Gdy zależy Ci na szybszym TTFB.</li>
              <li>Gdy chcesz ujawniać sekcje UI etapami.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach przejdziemy przez pełny pipeline SSR + hydratacja.
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
            Server APIs dostarczają HTML z Reacta na serwerze i wspierają streaming.
          </KangurLessonLead>
          <KangurLessonCaption>
            Masz fundament — czas na praktyczne scenariusze.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🛰️',
    title: 'Server APIs: React Dom Basics',
    description: 'Renderowanie po stronie serwera',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'streaming',
    emoji: '🌊',
    title: 'Streaming',
    description: 'renderToPipeableStream i renderToReadableStream',
    slideCount: SLIDES.streaming.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
