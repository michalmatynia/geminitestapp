import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'static' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Static APIs w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Static API z <strong>react-dom/server</strong> generuje gotowy HTML bez streamingu.
            To dobre rozwiązanie dla prostych stron i pre-renderingu.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Najczęściej używane: <strong>renderToString</strong> i <strong>renderToStaticMarkup</strong>.
          </KangurLessonCaption>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              renderToStaticMarkup
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`import { renderToStaticMarkup } from 'react-dom/server';

const html = renderToStaticMarkup(<EmailTemplate />);`}</code>
            </pre>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  static: [
    {
      title: 'Kiedy static?',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Static render świetnie sprawdza się w generowaniu statycznych stron, e-maili
            oraz HTML-a, który nie wymaga hydratacji.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Zastosowania</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Statyczne landing pages.</li>
              <li>Szablony e-maili.</li>
              <li>Proste raporty HTML.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Jeśli potrzebujesz Suspense i streamingu, wybierz API streamingowe.
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
            Static APIs generują HTML bez streamingu i hydratacji.
          </KangurLessonLead>
          <KangurLessonCaption>
            Masz bazę — czas na praktyczne przykłady.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🧊',
    title: 'Static APIs: React Dom Basics',
    description: 'Wprowadzenie do static API',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'static',
    emoji: '🧾',
    title: 'Static render',
    description: 'renderToStaticMarkup i renderToString',
    slideCount: SLIDES.static.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
