'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactServerDirectivesLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactServerDirectivesLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-server-directives'
      lessonEmoji='🧭'
      lessonTitle='Server Directives Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-400'
      dotDoneClass='bg-sky-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
