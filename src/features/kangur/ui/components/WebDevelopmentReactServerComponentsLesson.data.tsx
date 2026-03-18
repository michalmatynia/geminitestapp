import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'boundaries' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Server Components w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Server Components renderują się na serwerze i nie trafiają do bundla klienta.
            Dzięki temu UI może być lżejsze i szybsze.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Kluczowe jest rozdzielenie logiki na komponenty serwerowe i klienckie.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  boundaries: [
    {
      title: 'Granice Server/Client',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Komponenty klienckie oznaczasz dyrektywą <strong>use client</strong>. To one
            obsługują stan, efekty i interakcje użytkownika.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              Client boundary
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`'use client';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy jak łączyć oba typy komponentów.
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
            Server Components pomagają odciążyć klienta i poprawić wydajność.
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
    emoji: '🖥️',
    title: 'Server Component Basics',
    description: 'Wprowadzenie do Server Components',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'boundaries',
    emoji: '🧭',
    title: 'Granice',
    description: 'Podział na Server i Client',
    slideCount: SLIDES.boundaries.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
