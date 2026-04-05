import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54Lesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54Lesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4'
      lessonEmoji='🤖'
      lessonTitle='Codex 5.4: Foundations'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-indigo-300'
      dotActiveClass='bg-indigo-400'
      dotDoneClass='bg-indigo-200'
      completionSectionId='foundations'
      autoRecordComplete
    />
  );
}
