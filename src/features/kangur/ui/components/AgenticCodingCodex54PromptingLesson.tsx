'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54PromptingLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54PromptingLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-prompting'
      lessonEmoji='🎯'
      lessonTitle='Codex 5.4: Prompting & Context'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-rose-300'
      dotActiveClass='bg-rose-400'
      dotDoneClass='bg-rose-200'
      completionSectionId='prompting'
      autoRecordComplete
    />
  );
}
