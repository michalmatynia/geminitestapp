'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactHooksLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactHooksLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-hooks'
      lessonEmoji='🪝'
      lessonTitle='Hooks Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-indigo-300'
      dotActiveClass='bg-indigo-400'
      dotDoneClass='bg-indigo-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
