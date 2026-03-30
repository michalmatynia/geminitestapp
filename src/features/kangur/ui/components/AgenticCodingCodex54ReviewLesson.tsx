import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54ReviewLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54ReviewLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-review'
      lessonEmoji='🔍'
      lessonTitle='Codex 5.4: Review & Verification'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='review'
      autoRecordComplete
    />
  );
}
