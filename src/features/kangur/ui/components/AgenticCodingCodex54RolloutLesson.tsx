import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54RolloutLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54RolloutLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-rollout'
      lessonEmoji='🚀'
      lessonTitle='Codex 5.4: Team Rollout'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      dotActiveClass='bg-teal-400'
      dotDoneClass='bg-teal-200'
      completionSectionId='rollout'
      autoRecordComplete
    />
  );
}
