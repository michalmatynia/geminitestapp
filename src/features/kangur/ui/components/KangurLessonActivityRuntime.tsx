'use client';

import React from 'react';

import type {
  KangurLessonActivityRuntimeRendererId,
  KangurLessonActivityRuntimeSpec,
} from '@/shared/contracts/kangur-games';
import type { KangurMiniGameFinishActionProps } from '@/features/kangur/ui/types';

import AddingBallGame from './AddingBallGame';
import AddingSynthesisGame from './AddingSynthesisGame';
import CalendarInteractiveGame from './CalendarInteractiveGame';
import ClockTrainingGame from './ClockTrainingGame';
import DivisionGame from './DivisionGame';
import GeometryDrawingGame from './GeometryDrawingGame';
import MultiplicationArrayGame from './MultiplicationArrayGame';
import MultiplicationGame from './MultiplicationGame';
import SubtractingGardenGame from './SubtractingGardenGame';

const LESSON_ACTIVITY_RENDERERS: Record<
  KangurLessonActivityRuntimeRendererId,
  React.ComponentType<KangurMiniGameFinishActionProps>
> = {
  adding_ball_game: AddingBallGame,
  adding_synthesis_game: AddingSynthesisGame,
  calendar_interactive_game: CalendarInteractiveGame,
  clock_training_game: ClockTrainingGame,
  division_game: DivisionGame,
  geometry_drawing_game: GeometryDrawingGame,
  multiplication_array_game: MultiplicationArrayGame,
  multiplication_game: MultiplicationGame,
  subtracting_garden_game: SubtractingGardenGame,
};

const getLessonActivityRenderer = (
  rendererId: KangurLessonActivityRuntimeRendererId
): React.ComponentType<KangurMiniGameFinishActionProps> => {
  const Component = LESSON_ACTIVITY_RENDERERS[rendererId];

  if (!Component) {
    throw new Error(`Missing lesson activity renderer for "${rendererId}".`);
  }

  return Component;
};

export function KangurLessonActivityRuntime({
  onFinish,
  runtime,
}: KangurMiniGameFinishActionProps & {
  runtime: KangurLessonActivityRuntimeSpec;
}): React.JSX.Element {
  const ActivityComponent = getLessonActivityRenderer(runtime.rendererId);

  return <ActivityComponent onFinish={onFinish} />;
}
