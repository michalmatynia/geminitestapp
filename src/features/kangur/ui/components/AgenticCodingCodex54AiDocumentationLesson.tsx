import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54AiDocumentationLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54AiDocumentationLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-ai-documentation'
      lessonEmoji='📚'
      lessonTitle='Codex 5.4: AI Documentation'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      dotActiveClass='bg-emerald-400'
      dotDoneClass='bg-emerald-200'
      completionSectionId='ai_documentation'
      autoRecordComplete
    />
  );
}
