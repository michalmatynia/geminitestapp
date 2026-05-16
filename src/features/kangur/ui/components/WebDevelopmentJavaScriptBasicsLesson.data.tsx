import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'values' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'JavaScript in the browser',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            JavaScript is the programming language that turns a static page into an
            interactive experience. It can read user actions, update the page, validate
            forms, request data, and run in browsers or other runtimes.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Start with small console experiments: one value, one statement, one visible
            result.
          </KangurLessonCaption>
          <div className='flex flex-wrap gap-2'>
            <KangurLessonChip accent='amber'>values</KangurLessonChip>
            <KangurLessonChip accent='sky'>variables</KangurLessonChip>
            <KangurLessonChip accent='emerald'>expressions</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  values: [
    {
      title: 'Values, variables, and decisions',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            A script is built from values. Store them with <strong>const</strong> when
            they do not need to change and <strong>let</strong> when the value will be
            reassigned.
          </KangurLessonLead>
          <KangurLessonInset accent='amber' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              Console practice
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`const learner = 'StudiQ';
let completedLessons = 2;

completedLessons = completedLessons + 1;

if (completedLessons >= 3) {
  console.log(learner + ' unlocked JavaScript practice.');
}`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            This combines strings, numbers, reassignment, comparison, a conditional, and
            console output.
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
            JavaScript first steps are about reading code from top to bottom, naming
            values clearly, and checking behavior immediately in the console.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Once variables and expressions feel familiar, loops, functions, objects, and
            browser APIs become easier to connect.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '📜',
    title: 'First Steps',
    description: 'What JavaScript does',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'values',
    emoji: '🧪',
    title: 'Values',
    description: 'Variables and decisions',
    slideCount: SLIDES.values.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Summary',
    description: 'Core beginner model',
    slideCount: SLIDES.summary.length,
  },
];
