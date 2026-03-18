'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54ToolingLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54ToolingLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-tooling'
      lessonEmoji='🛠️'
      lessonTitle='Codex 5.4: Tooling & Search'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-slate'
      progressDotClassName='bg-slate-300'
      dotActiveClass='bg-slate-400'
      dotDoneClass='bg-slate-200'
      completionSectionId='tooling'
      autoRecordComplete
    />
  );
}
