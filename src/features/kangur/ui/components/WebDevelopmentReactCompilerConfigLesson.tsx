'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactCompilerConfigLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactCompilerConfigLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-compiler-configuration'
      lessonEmoji='🛠️'
      lessonTitle='React Compiler Configuration Basics'
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
