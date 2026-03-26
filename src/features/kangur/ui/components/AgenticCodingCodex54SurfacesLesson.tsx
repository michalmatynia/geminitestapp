'use client';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54SurfacesLesson.data';

export { HUB_SECTIONS, SLIDES };

const AGENTIC_SURFACE_MATCH_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'agentic_surface_match_lesson_stage'
);

export default function AgenticCodingCodex54SurfacesLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-surfaces'
      lessonEmoji='🧩'
      lessonTitle='Codex 5.4: Surfaces'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      dotActiveClass='bg-emerald-400'
      dotDoneClass='bg-emerald-200'
      skipMarkFor={['surface_match_game']}
      games={[
        {
          sectionId: 'surface_match_game',
          stage: {
            accent: 'emerald',
            icon: '🧭',
            title: 'Surface Match',
            description: 'Match each scenario to the best Codex surface.',
            maxWidthClassName: 'max-w-4xl',
            shellTestId: 'agentic-surface-match-game-shell',
          },
          runtime: AGENTIC_SURFACE_MATCH_RUNTIME,
        },
      ]}
      completionSectionId='surfaces'
      autoRecordComplete
    />
  );
}
