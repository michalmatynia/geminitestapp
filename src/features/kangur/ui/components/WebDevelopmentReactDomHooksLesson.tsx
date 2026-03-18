'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactDomHooksLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactDomHooksLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-dom-hooks'
      lessonEmoji='🧲'
      lessonTitle='Hooks: React Dom Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-400'
      dotDoneClass='bg-violet-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
