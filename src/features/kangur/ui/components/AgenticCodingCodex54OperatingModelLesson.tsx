import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54OperatingModelLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54OperatingModelLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-operating-model'
      lessonEmoji='🔁'
      lessonTitle='Codex 5.4: Operating Model'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-400'
      dotDoneClass='bg-violet-200'
      completionSectionId='operating_model'
      autoRecordComplete
    />
  );
}
