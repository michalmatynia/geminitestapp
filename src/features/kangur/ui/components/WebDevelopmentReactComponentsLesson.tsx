'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactComponentsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactComponentsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-components'
      lessonEmoji='⚛️'
      lessonTitle='React 19.2'
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
