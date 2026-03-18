'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54DosDontsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54DosDontsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-dos-donts'
      lessonEmoji='✅'
      lessonTitle="Codex 5.4: Do's & Don'ts"
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-400'
      dotDoneClass='bg-violet-200'
      completionSectionId='dos_donts'
      autoRecordComplete
    />
  );
}
