import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'types' | 'collections' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  types: [
    {
      title: 'Syntax, types, and operators',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            JavaScript is dynamically typed, so values carry types at runtime. Learn the
            common primitives first: string, number, boolean, null, undefined, bigint,
            and symbol.
          </KangurLessonLead>
          <KangurLessonInset accent='sky' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`const title = 'JavaScript';
const lessonCount = 6;
const isPublished = true;

console.log(typeof title);
console.log(Number('42') + lessonCount);
console.log(title === 'JavaScript');`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Prefer explicit conversion and strict equality when comparing values.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  collections: [
    {
      title: 'Objects, arrays, maps, and sets',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Objects group named properties. Arrays preserve order. Map and Set are useful
            when keys or unique values matter more than object shape.
          </KangurLessonLead>
          <KangurLessonInset accent='sky' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`const lesson = {
  title: 'Syntax, Types & Data',
  minutes: 18,
};

const topics = ['strings', 'numbers', 'arrays'];
const progress = new Map([['syntax', true]]);
const uniqueTopics = new Set(topics);

console.log(Array.isArray(topics));
console.log(uniqueTopics.has('arrays'));`}</code>
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
            Good JavaScript syntax is readable, explicit about conversions, and careful
            about which data structure matches the job.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            When a result is surprising, inspect the value and its type before changing
            the code.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'types',
    emoji: '🔤',
    title: 'Types',
    description: 'Primitives and operators',
    slideCount: SLIDES.types.length,
  },
  {
    id: 'collections',
    emoji: '🗂️',
    title: 'Collections',
    description: 'Objects and arrays',
    slideCount: SLIDES.collections.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Summary',
    description: 'Data habits',
    slideCount: SLIDES.summary.length,
  },
];
