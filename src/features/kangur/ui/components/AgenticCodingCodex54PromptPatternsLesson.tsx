import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54PromptPatternsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54PromptPatternsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-prompt-patterns'
      lessonEmoji='📝'
      lessonTitle='Codex 5.4: Prompt Patterns'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-indigo-300'
      dotActiveClass='bg-indigo-400'
      dotDoneClass='bg-indigo-200'
      completionSectionId='prompt_patterns'
      autoRecordComplete
    />
  );
}
