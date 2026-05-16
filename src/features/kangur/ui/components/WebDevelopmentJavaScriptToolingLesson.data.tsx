import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'reference' | 'debugging' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  reference: [
    {
      title: 'Using the JavaScript reference',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            A strong JavaScript developer knows how to use reference pages. Look up
            built-in objects, operators, statements, functions, classes, regular
            expressions, and error types when behavior is unclear.
          </KangurLessonLead>
          <KangurLessonInset accent='rose' className='text-left'>
            <ul className='list-disc space-y-2 pl-4 text-sm text-slate-700'>
              <li>Check syntax before copying an example.</li>
              <li>Read return values and thrown errors.</li>
              <li>Review browser compatibility for client-side code.</li>
            </ul>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  debugging: [
    {
      title: 'Debugging with intent',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Debugging is a loop: reproduce the issue, inspect state, change one thing,
            and confirm the result.
          </KangurLessonLead>
          <KangurLessonInset accent='rose' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`console.table(lessons);
console.assert(total > 0, 'Expected lessons to be loaded');

try {
  JSON.parse(source);
} catch (error) {
  console.error('Invalid lesson data', error);
}`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Console output, breakpoints, network logs, and stack traces answer different
            questions. Pick the tool that matches the unknown.
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
            Reference and debugging skills keep JavaScript learning practical. They help
            you verify syntax, understand platform behavior, and fix mistakes with less
            guessing.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Treat documentation as part of the workflow, not something separate from
            coding.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'reference',
    emoji: '📚',
    title: 'Reference',
    description: 'Look up language behavior',
    slideCount: SLIDES.reference.length,
  },
  {
    id: 'debugging',
    emoji: '🧭',
    title: 'Debugging',
    description: 'Inspect and verify',
    slideCount: SLIDES.debugging.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Summary',
    description: 'Reference workflow',
    slideCount: SLIDES.summary.length,
  },
];
