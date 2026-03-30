import type {
  KangurLessonActivityRuntimeSpec,
  KangurLessonActivityRuntimeRendererId,
} from '@/shared/contracts/kangur-games';
import { kangurLessonActivityRuntimeSpecSchema } from '@/shared/contracts/kangur-games';
import type { KangurLessonActivityId } from '@/features/kangur/shared/contracts/kangur';

type KangurLessonActivityRuntimeSpecInput = Omit<KangurLessonActivityRuntimeSpec, 'kind'>;

const createLessonActivityRuntimeSpec = (
  spec: KangurLessonActivityRuntimeSpecInput
): KangurLessonActivityRuntimeSpec =>
  kangurLessonActivityRuntimeSpecSchema.parse({
    kind: 'lesson_activity',
    ...spec,
  });

const createSharedLessonActivityRuntimeSpec = (
  activityId: KangurLessonActivityId,
  rendererId: KangurLessonActivityRuntimeRendererId,
  engineId: string
): KangurLessonActivityRuntimeSpec =>
  createLessonActivityRuntimeSpec({
    activityId,
    engineId,
    rendererId,
  });

export const KANGUR_LESSON_ACTIVITY_RUNTIME_SPECS = Object.freeze({
  'adding-ball': createSharedLessonActivityRuntimeSpec(
    'adding-ball',
    'adding_ball_game',
    'quantity-drag-engine'
  ),
  'adding-synthesis': createSharedLessonActivityRuntimeSpec(
    'adding-synthesis',
    'adding_synthesis_game',
    'rhythm-answer-engine'
  ),
  'subtracting-game': createSharedLessonActivityRuntimeSpec(
    'subtracting-game',
    'subtracting_garden_game',
    'quantity-drag-engine'
  ),
  'multiplication-array': createSharedLessonActivityRuntimeSpec(
    'multiplication-array',
    'multiplication_array_game',
    'array-builder-engine'
  ),
  'multiplication-quiz': createSharedLessonActivityRuntimeSpec(
    'multiplication-quiz',
    'multiplication_game',
    'choice-quiz-engine'
  ),
  'division-game': createSharedLessonActivityRuntimeSpec(
    'division-game',
    'division_game',
    'choice-quiz-engine'
  ),
  'geometry-drawing': createSharedLessonActivityRuntimeSpec(
    'geometry-drawing',
    'geometry_drawing_game',
    'shape-drawing-engine'
  ),
  'calendar-interactive': createSharedLessonActivityRuntimeSpec(
    'calendar-interactive',
    'calendar_interactive_game',
    'calendar-grid-engine'
  ),
  'clock-training': createSharedLessonActivityRuntimeSpec(
    'clock-training',
    'clock_training_game',
    'clock-dial-engine'
  ),
} satisfies Record<KangurLessonActivityId, KangurLessonActivityRuntimeSpec>);

export const getKangurLessonActivityRuntimeSpec = (
  activityId: KangurLessonActivityId
): KangurLessonActivityRuntimeSpec => {
  const spec = KANGUR_LESSON_ACTIVITY_RUNTIME_SPECS[activityId];

  if (!spec) {
    throw new Error(`Missing lesson activity runtime spec for "${activityId}".`);
  }

  return spec;
};
