'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54ResponsesLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54ResponsesLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-responses'
      lessonEmoji='📡'
      lessonTitle='Codex 5.4: Responses & Tools'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-400'
      dotDoneClass='bg-sky-200'
      completionSectionId='responses'
      autoRecordComplete
    />
  );
}
