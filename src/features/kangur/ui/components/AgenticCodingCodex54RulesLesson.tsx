'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54RulesLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54RulesLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-rules'
      lessonEmoji='🧷'
      lessonTitle='Codex 5.4: Rules & Execpolicy'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-400'
      dotDoneClass='bg-violet-200'
      completionSectionId='rules-execpolicy'
      autoRecordComplete
    />
  );
}
