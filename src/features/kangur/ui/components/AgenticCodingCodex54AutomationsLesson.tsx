import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54AutomationsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54AutomationsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-automations'
      lessonEmoji='⏱️'
      lessonTitle='Codex 5.4: Automations'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-indigo-300'
      dotActiveClass='bg-indigo-400'
      dotDoneClass='bg-indigo-200'
      completionSectionId='automations'
      autoRecordComplete
    />
  );
}
