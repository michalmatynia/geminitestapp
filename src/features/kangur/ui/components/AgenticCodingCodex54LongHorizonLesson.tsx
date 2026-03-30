import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54LongHorizonLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54LongHorizonLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-long-horizon'
      lessonEmoji='🛰️'
      lessonTitle='Codex 5.4: Long-Horizon'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-400'
      dotDoneClass='bg-sky-200'
      completionSectionId='long_horizon'
      autoRecordComplete
    />
  );
}
