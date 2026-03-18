'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54AppWorkflowsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54AppWorkflowsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-app-workflows'
      lessonEmoji='🧵'
      lessonTitle='Codex 5.4: App Workflows'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      dotActiveClass='bg-teal-400'
      dotDoneClass='bg-teal-200'
      completionSectionId='app_workflows'
      autoRecordComplete
    />
  );
}
