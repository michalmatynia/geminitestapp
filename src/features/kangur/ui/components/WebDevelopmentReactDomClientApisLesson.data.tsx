import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'roots' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Client APIs w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Client API z <strong>react-dom</strong> odpowiada za uruchamianie aplikacji
            w przeglądarce: montowanie i hydratację.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Kluczowe funkcje: <strong>createRoot</strong> i <strong>hydrateRoot</strong>.
          </KangurLessonCaption>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              createRoot
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root'));
root.render(<App />);`}</code>
            </pre>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  roots: [
    {
      title: 'Montowanie i hydratacja',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy masz HTML wygenerowany na serwerze, używasz <strong>hydrateRoot</strong>.
            Dzięki temu React przejmuje istniejący DOM bez pełnego re-renderu.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              hydrateRoot
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document.getElementById('root'), <App />);`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach pokażemy, jak mierzyć czas hydratacji i diagnozować błędy.
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
            Client APIs uruchamiają aplikację w przeglądarce i łączą ją z DOM.
          </KangurLessonLead>
          <KangurLessonCaption>
            Masz bazę — teraz czas na praktyczne scenariusze.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '📡',
    title: 'Client APIs: React Dom Basics',
    description: 'Uruchamianie aplikacji w przeglądarce',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'roots',
    emoji: '🧭',
    title: 'Rooty',
    description: 'createRoot i hydrateRoot',
    slideCount: SLIDES.roots.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
