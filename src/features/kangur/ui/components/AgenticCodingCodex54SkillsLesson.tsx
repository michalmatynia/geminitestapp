import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54SkillsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54SkillsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-skills'
      lessonEmoji='🧰'
      lessonTitle='Codex 5.4: Skills & MCP'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      dotActiveClass='bg-emerald-400'
      dotDoneClass='bg-emerald-200'
      completionSectionId='skills'
      autoRecordComplete
    />
  );
}
