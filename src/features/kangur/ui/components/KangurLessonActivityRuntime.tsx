'use client';

import React from 'react';

import type {
  KangurLessonActivityRuntimeRendererId,
  KangurLessonActivityRuntimeSpec,
} from '@/shared/contracts/kangur-games';
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
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

const LESSON_ACTIVITY_RENDERERS: Partial<
  Record<
  KangurLessonActivityRuntimeRendererId,
  React.ComponentType<KangurMiniGameFinishActionProps>
  >
> = {
  adding_ball_game: AddingBallGame,
  adding_synthesis_game: AddingSynthesisGame,
  division_game: DivisionGame,
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

const resolveGeometryDrawingGameRendererProps = ({
  onFinish,
  rendererProps,
}: {
  onFinish: () => void;
  rendererProps?: KangurGameRuntimeRendererProps;
}): React.ComponentProps<typeof GeometryDrawingGame> => ({
  activityKey: rendererProps?.activityKey,
  difficultyLabelOverride: rendererProps?.difficultyLabelOverride,
  finishLabel: rendererProps?.finishLabel,
  lessonKey: rendererProps?.lessonKey,
  onFinish,
  operation: rendererProps?.operation,
  shapeIds: rendererProps?.shapeIds,
  showDifficultySelector: rendererProps?.showDifficultySelector,
});

export function KangurLessonActivityRuntime({
  onFinish,
  rendererProps,
  runtime,
}: KangurMiniGameFinishActionProps & {
  rendererProps?: KangurGameRuntimeRendererProps;
  runtime: KangurLessonActivityRuntimeSpec;
}): React.JSX.Element {
  if (runtime.rendererId === 'calendar_interactive_game') {
    return (
      <CalendarInteractiveGame
        calendarSection={rendererProps?.calendarSection}
        onFinish={onFinish}
      />
    );
  }

  if (runtime.rendererId === 'clock_training_game') {
    return (
      <ClockTrainingGame
        hideModeSwitch={rendererProps?.showClockModeSwitch === false}
        initialMode={rendererProps?.clockInitialMode}
        onFinish={onFinish}
        section={rendererProps?.clockSection}
        showHourHand={rendererProps?.showClockHourHand}
        showMinuteHand={rendererProps?.showClockMinuteHand}
        showTaskTitle={rendererProps?.showClockTaskTitle}
        showTimeDisplay={rendererProps?.showClockTimeDisplay}
      />
    );
  }

  if (runtime.rendererId === 'geometry_drawing_game') {
    return (
      <GeometryDrawingGame
        {...resolveGeometryDrawingGameRendererProps({
          onFinish,
          rendererProps,
        })}
      />
    );
  }

  const ActivityComponent = getLessonActivityRenderer(runtime.rendererId);
  return <ActivityComponent onFinish={onFinish} />;
}
