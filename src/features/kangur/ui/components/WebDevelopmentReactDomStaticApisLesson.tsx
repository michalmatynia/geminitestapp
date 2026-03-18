'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactDomStaticApisLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactDomStaticApisLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-dom-static-apis'
      lessonEmoji='🧊'
      lessonTitle='Static APIs: React Dom Basics'
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
