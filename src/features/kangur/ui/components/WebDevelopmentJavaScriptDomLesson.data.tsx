import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'dom' | 'events' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  dom: [
    {
      title: 'DOM and browser APIs',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            The DOM is the browser model of the page. JavaScript can select elements,
            read their state, change text, update attributes, and create new nodes.
          </KangurLessonLead>
          <KangurLessonInset accent='emerald' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`const status = document.querySelector('[data-status]');

if (status) {
  status.textContent = 'Ready for JavaScript practice';
  status.classList.add('is-ready');
}`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Browser APIs are separate from the language itself, but they are where
            browser JavaScript becomes visible to users.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  events: [
    {
      title: 'Events and user input',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Events connect user actions to functions. Keep handlers small, read from the
            event target, then update the DOM or application state.
          </KangurLessonLead>
          <KangurLessonInset accent='emerald' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`const form = document.querySelector('form');

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  console.log(data.get('email'));
});`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Common browser API work includes forms, fetch requests, timers, storage, and
            accessibility-friendly updates.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Summary',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            DOM code should be deliberate: select the right element, handle the right
            event, and make the smallest useful page update.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            That habit keeps browser JavaScript predictable as pages grow.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'dom',
    emoji: '🌐',
    title: 'DOM',
    description: 'Select and update elements',
    slideCount: SLIDES.dom.length,
  },
  {
    id: 'events',
    emoji: '🖱️',
    title: 'Events',
    description: 'Handle interactions',
    slideCount: SLIDES.events.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Summary',
    description: 'Browser API model',
    slideCount: SLIDES.summary.length,
  },
];
