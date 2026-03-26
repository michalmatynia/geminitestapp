'use client';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54ModelsLesson.data';

export { HUB_SECTIONS, SLIDES };

const AGENTIC_REASONING_ROUTER_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'agentic_reasoning_router_lesson_stage'
);

export default function AgenticCodingCodex54ModelsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-models'
      lessonEmoji='🧠'
      lessonTitle='Codex 5.4: Models & Reasoning'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      dotActiveClass='bg-teal-400'
      dotDoneClass='bg-teal-200'
      skipMarkFor={['reasoning_router_game']}
      games={[
        {
          sectionId: 'reasoning_router_game',
          stage: {
            accent: 'teal',
            icon: '🎛️',
            title: 'Reasoning Router',
            description: 'Route tasks to the right reasoning effort.',
            maxWidthClassName: 'max-w-4xl',
            shellTestId: 'agentic-reasoning-router-game-shell',
          },
          runtime: AGENTIC_REASONING_ROUTER_RUNTIME,
        },
      ]}
      completionSectionId='models'
      autoRecordComplete
    />
  );
}
