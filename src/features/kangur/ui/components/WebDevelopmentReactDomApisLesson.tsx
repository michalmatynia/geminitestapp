'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactDomApisLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactDomApisLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-dom-apis'
      lessonEmoji='🧰'
      lessonTitle='APIs: React Dom Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
