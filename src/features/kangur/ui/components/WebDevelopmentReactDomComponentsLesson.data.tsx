import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'dom' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'React DOM Components w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Komponenty DOM to elementy JSX, które mapują się bezpośrednio na HTML w przeglądarce.
            Dzięki nim React renderuje strukturę interfejsu.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Przykłady: <strong>{'<button>'}</strong>, <strong>{'<input>'}</strong>,
            <strong>{' <section>'}</strong>.
          </KangurLessonCaption>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              Przykład
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`export function Card() {
  return (
    <section>
      <h2>Nowe zadanie</h2>
      <button>Start</button>
    </section>
  );
}`}</code>
            </pre>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  dom: [
    {
      title: 'Praca z DOM',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            React DOM oferuje dodatkowe narzędzia, gdy potrzebujesz wyjść poza standardowy JSX.
            To m.in. portale, integracja z formularzami oraz kontrola nad renderem.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Przykładowe narzędzia</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Portale dla modali i tooltipów.</li>
              <li>Atrybuty formularzy i integracja z walidacją.</li>
              <li>Integracja z bibliotekami DOM.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy konkretne przykłady użycia.
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
            React DOM Components to fundament, na którym budujesz UI.
          </KangurLessonLead>
          <KangurLessonCaption>
            Teraz czas na praktyczne scenariusze z DOM.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🧩',
    title: 'Components: React Dom Basics',
    description: 'Wprowadzenie do komponentów DOM',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'dom',
    emoji: '🧱',
    title: 'DOM',
    description: 'Praca z elementami DOM',
    slideCount: SLIDES.dom.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
