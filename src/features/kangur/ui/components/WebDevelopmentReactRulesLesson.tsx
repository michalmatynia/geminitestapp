'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactRulesLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactRulesLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-rules'
      lessonEmoji='📜'
      lessonTitle='Rules Of React Basics'
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
