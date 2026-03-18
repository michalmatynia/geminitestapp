import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'portals' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'React DOM APIs w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            React DOM dostarcza API do pracy z drzewem DOM, portalami i integracją z HTML.
            To narzędzia uzupełniające podstawowy JSX.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Przykłady: <strong>createPortal</strong>, <strong>flushSync</strong>,
            <strong> createRoot</strong>.
          </KangurLessonCaption>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              createPortal
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`import { createPortal } from 'react-dom';

function Modal({ children }) {
  return createPortal(children, document.body);
}`}</code>
            </pre>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  portals: [
    {
      title: 'Portale i kontrola renderu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Portale pozwalają renderować UI poza głównym drzewem komponentów, np. dla modali,
            tooltipów lub powiadomień.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Kiedy się przydaje?</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Modal, który musi być nad resztą UI.</li>
              <li>Tooltipy nad elementami z overflow.</li>
              <li>Warstwy nawigacji i komunikatów.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            W kolejnych lekcjach wejdziemy głębiej w praktyczne scenariusze.
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
            React DOM APIs to narzędzia do pracy z DOM i specjalnymi przypadkami renderu.
          </KangurLessonLead>
          <KangurLessonCaption>
            Masz podstawy — czas na praktykę.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🧰',
    title: 'APIs: React Dom Basics',
    description: 'Wprowadzenie do API react-dom',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'portals',
    emoji: '🪟',
    title: 'Portale',
    description: 'Render poza głównym drzewem',
    slideCount: SLIDES.portals.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
