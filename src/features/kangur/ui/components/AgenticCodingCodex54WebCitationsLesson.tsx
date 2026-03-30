import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54WebCitationsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54WebCitationsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-web-citations'
      lessonEmoji='🌐'
      lessonTitle='Codex 5.4: Web & Citations'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-400'
      dotDoneClass='bg-sky-200'
      completionSectionId='web_citations'
      autoRecordComplete
    />
  );
}
