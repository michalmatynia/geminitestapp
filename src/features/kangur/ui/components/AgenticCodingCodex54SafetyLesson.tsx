'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54SafetyLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54SafetyLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-safety'
      lessonEmoji='🛡️'
      lessonTitle='Codex 5.4: Config & Safety'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-slate'
      progressDotClassName='bg-slate-300'
      dotActiveClass='bg-slate-400'
      dotDoneClass='bg-slate-200'
      completionSectionId='safety'
      autoRecordComplete
    />
  );
}
