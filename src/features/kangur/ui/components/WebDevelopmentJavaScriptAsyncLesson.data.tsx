import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'callbacks' | 'promises' | 'asyncawait' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  callbacks: [
    {
      title: 'Callbacks and the event loop',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Asynchronous JavaScript lets the browser keep responding while work finishes
            later. A callback is a function passed in so it can run after an event,
            timer, or request.
          </KangurLessonLead>
          <KangurLessonInset accent='teal' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`setTimeout(() => {
  console.log('Practice reminder shown later');
}, 1000);

button.addEventListener('click', () => {
  console.log('User started the next lesson');
});`}</code>
            </pre>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  promises: [
    {
      title: 'Promises and fetch',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            A Promise represents work that may finish in the future. It can resolve with
            a value or reject with an error.
          </KangurLessonLead>
          <KangurLessonInset accent='teal' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`fetch('/api/lessons/javascript')
  .then((response) => response.json())
  .then((lesson) => console.log(lesson.title))
  .catch((error) => console.error(error));`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Promise chains are useful, but long chains can become hard to scan.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  asyncawait: [
    {
      title: 'async and await',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            An async function always returns a Promise. Inside it, await lets code read
            like a sequence while still running asynchronously.
          </KangurLessonLead>
          <KangurLessonInset accent='teal' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`async function loadLesson(id) {
  try {
    const response = await fetch('/api/lessons/' + id);
    return await response.json();
  } catch (error) {
    console.error('Could not load lesson', error);
    return null;
  }
}`}</code>
            </pre>
          </KangurLessonInset>
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
            Use callbacks for events, Promises for future values, and async/await for
            readable flows that need error handling.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Always decide where loading, success, and failure states should appear in the
            user interface.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'callbacks',
    emoji: '🔁',
    title: 'Callbacks',
    description: 'Events and timers',
    slideCount: SLIDES.callbacks.length,
  },
  {
    id: 'promises',
    emoji: '🔗',
    title: 'Promises',
    description: 'Future values',
    slideCount: SLIDES.promises.length,
  },
  {
    id: 'asyncawait',
    emoji: '⚡',
    title: 'async/await',
    description: 'Readable async flow',
    slideCount: SLIDES.asyncawait.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Summary',
    description: 'Async decisions',
    slideCount: SLIDES.summary.length,
  },
];
