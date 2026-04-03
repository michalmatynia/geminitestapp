import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'rules' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Hooki w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Hooki to funkcje Reacta zaczynające się od <strong>use</strong>. Pozwalają
            dodawać stan i logikę do komponentów funkcyjnych.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Najczęściej spotkasz <strong>useState</strong> i <strong>useEffect</strong>.
          </KangurLessonCaption>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              Przykład
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`function Counter() {
  const [count, setCount] = ${'use' + 'State'}(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Kliknięcia: {count}
    </button>
  );
}`}</code>
            </pre>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  rules: [
    {
      title: 'Zasady hooków',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Hooki mają dwie kluczowe zasady: wywołuj je zawsze na górnym poziomie
            komponentu i tylko w komponentach albo własnych hookach.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Zapamiętaj</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Nie wywołuj hooków w pętlach ani warunkach.</li>
              <li>Nie wywołuj hooków poza komponentem lub custom hookiem.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Dzięki temu React zachowuje spójny porządek hooków przy każdym renderze.
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
          <KangurLessonLead>Hooki to fundament logiki w React 19.2.</KangurLessonLead>
          <KangurLessonCaption>
            W kolejnych lekcjach rozbijemy je na praktyczne scenariusze.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🪝',
    title: 'Hooks Basics',
    description: 'Wprowadzenie do hooków',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'rules',
    emoji: '📌',
    title: 'Zasady',
    description: 'Bezpieczne użycie hooków',
    slideCount: SLIDES.rules.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
