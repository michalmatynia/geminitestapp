'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactLintsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactLintsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-lints'
      lessonEmoji='🧹'
      lessonTitle='Lint Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-rose-300'
      dotActiveClass='bg-rose-400'
      dotDoneClass='bg-rose-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
