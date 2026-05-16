import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'functions' | 'modules' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  functions: [
    {
      title: 'Functions, scope, and objects',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            JavaScript treats functions as values. That makes callbacks, array methods,
            event handlers, closures, and reusable modules possible.
          </KangurLessonLead>
          <KangurLessonInset accent='violet' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`const createProgressLabel = (topic) => {
  let percent = 0;

  return (nextPercent) => {
    percent = nextPercent;
    return topic + ': ' + String(percent) + '% complete';
  };
};

const label = createProgressLabel('JavaScript');
console.log(label(40));`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            The returned function remembers the variables from the outer function.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  modules: [
    {
      title: 'Classes and modules',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Modern JavaScript organizes larger programs with modules. Classes provide a
            familiar syntax for objects that share behavior.
          </KangurLessonLead>
          <KangurLessonInset accent='violet' className='text-left'>
            <pre className='overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`export class LessonProgress {
  constructor(total) {
    this.total = total;
    this.completed = 0;
  }

  completeOne() {
    this.completed += 1;
  }
}`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Use exports for values that other files should import and keep helper details
            private inside the module.
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
            Functions, objects, classes, and modules are the structure tools of
            JavaScript. They let you split behavior into named pieces with clear inputs.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Prefer simple functions first, then add objects, classes, or modules when the
            code needs more organization.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'functions',
    emoji: '✨',
    title: 'Functions',
    description: 'Scope and closures',
    slideCount: SLIDES.functions.length,
  },
  {
    id: 'modules',
    emoji: '🧩',
    title: 'Modules',
    description: 'Classes and exports',
    slideCount: SLIDES.modules.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Summary',
    description: 'Code structure',
    slideCount: SLIDES.summary.length,
  },
];
