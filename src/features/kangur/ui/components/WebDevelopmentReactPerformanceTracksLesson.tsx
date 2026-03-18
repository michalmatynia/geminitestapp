'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactPerformanceTracksLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactPerformanceTracksLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-performance-tracks'
      lessonEmoji='📈'
      lessonTitle='Performance Tracks Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      dotActiveClass='bg-teal-400'
      dotDoneClass='bg-teal-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
