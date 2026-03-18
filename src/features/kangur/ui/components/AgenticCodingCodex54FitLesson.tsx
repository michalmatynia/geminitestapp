'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54FitLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54FitLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-fit'
      lessonEmoji='🧭'
      lessonTitle='Codex 5.4: Fit & Limits'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-400'
      dotDoneClass='bg-sky-200'
      completionSectionId='fit'
      autoRecordComplete
    />
  );
}
