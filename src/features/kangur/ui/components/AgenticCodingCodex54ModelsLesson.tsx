'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54ModelsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54ModelsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-models'
      lessonEmoji='🧠'
      lessonTitle='Codex 5.4: Models & Reasoning'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      dotActiveClass='bg-teal-400'
      dotDoneClass='bg-teal-200'
      completionSectionId='models'
      autoRecordComplete
    />
  );
}
