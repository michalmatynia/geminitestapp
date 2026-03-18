'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactDomServerApisLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactDomServerApisLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-dom-server-apis'
      lessonEmoji='🛰️'
      lessonTitle='Server APIs: React Dom Basics'
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
