'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactCompilerDirectivesLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactCompilerDirectivesLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-compiler-directives'
      lessonEmoji='📌'
      lessonTitle='React Compiler Directives Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      dotActiveClass='bg-emerald-400'
      dotDoneClass='bg-emerald-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
