'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactServerFunctionsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactServerFunctionsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-server-functions'
      lessonEmoji='🧪'
      lessonTitle='Server Functions Basics'
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
