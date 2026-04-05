import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54NonEngineersLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54NonEngineersLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-non-engineers'
      lessonEmoji='👥'
      lessonTitle='Codex 5.4: Non-Engineer Playbook'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='non_engineers'
      autoRecordComplete
    />
  );
}
