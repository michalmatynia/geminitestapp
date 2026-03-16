import type { KangurAiTutorFollowUpAction } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

export type KangurAiTutorBridgeFollowUpDirection =
  | 'lesson_to_game'
  | 'game_to_lesson';

export type KangurAiTutorFollowUpReportingSummary = {
  primaryFollowUpActionId: string | null;
  primaryFollowUpPage: KangurAiTutorFollowUpAction['page'] | null;
  hasBridgeFollowUpAction: boolean;
  bridgeFollowUpActionCount: number;
  bridgeFollowUpDirection: KangurAiTutorBridgeFollowUpDirection | null;
};

export const getKangurAiTutorBridgeFollowUpDirection = (
  actionId: string | null | undefined
): KangurAiTutorBridgeFollowUpDirection | null => {
  if (!actionId) {
    return null;
  }

  if (actionId.startsWith('bridge:lesson-to-game:')) {
    return 'lesson_to_game';
  }

  if (actionId.startsWith('bridge:game-to-lesson:')) {
    return 'game_to_lesson';
  }

  return null;
};

export const summarizeKangurAiTutorFollowUpActions = (
  actions: KangurAiTutorFollowUpAction[]
): KangurAiTutorFollowUpReportingSummary => {
  const primaryAction = actions[0] ?? null;
  const bridgeDirections = actions
    .map((action) => getKangurAiTutorBridgeFollowUpDirection(action.id))
    .filter(
      (direction): direction is KangurAiTutorBridgeFollowUpDirection => Boolean(direction)
    );

  return {
    primaryFollowUpActionId: primaryAction?.id ?? null,
    primaryFollowUpPage: primaryAction?.page ?? null,
    hasBridgeFollowUpAction: bridgeDirections.length > 0,
    bridgeFollowUpActionCount: bridgeDirections.length,
    bridgeFollowUpDirection: bridgeDirections[0] ?? null,
  };
};
