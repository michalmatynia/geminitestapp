'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './LogicalAnalogiesLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function LogicalAnalogiesLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='logical-analogies'
      lessonEmoji='🧩'
      lessonTitle='Analogie'
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
