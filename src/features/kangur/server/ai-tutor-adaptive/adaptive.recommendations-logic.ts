import type {
  KangurAssignmentSnapshot,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurAiTutorConversationContext,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type {
  KangurLearnerRecommendation,
  KangurLessonMasteryInsight,
} from '@/features/kangur/shared/contracts/kangur-profile';
import {
  normalizeLessonComponentCandidate,
} from './adaptive.utils';
import {
  toAssignmentFollowUpAction,
  toRecommendationFollowUpAction,
} from './adaptive.recommendations';
import { resolveLessonFocusFromAction } from './adaptive.recommendations-focus';
import type { KangurLessonFocusCandidate } from './adaptive.contracts';

export const resolveLessonFocusFromAdaptiveSnapshot = (input: {
  context?: KangurAiTutorConversationContext;
  relevantWeakLesson: KangurLessonMasteryInsight | null;
  relevantAssignment: KangurAssignmentSnapshot | null;
  topRecommendation: KangurLearnerRecommendation | null;
  averageAccuracy: number;
}): KangurLessonFocusCandidate | null => {
  const contextComponentId =
    normalizeLessonComponentCandidate(input.context?.focusId) ??
    normalizeLessonComponentCandidate(input.context?.contentId);
  if (contextComponentId) {
    return {
      componentId: contextComponentId,
      title: input.context?.title?.trim() || null,
    };
  }

  if (input.relevantWeakLesson) {
    const weakLessonComponentId = normalizeLessonComponentCandidate(
      input.relevantWeakLesson.componentId
    );
    if (weakLessonComponentId) {
      return {
        componentId: weakLessonComponentId,
        title: input.relevantWeakLesson.title,
      };
    }
  }

  const assignmentFocus = resolveLessonFocusFromAction(
    input.relevantAssignment
      ? toAssignmentFollowUpAction(input.relevantAssignment, input.averageAccuracy)
      : null
  );
  if (assignmentFocus) return assignmentFocus;

  return resolveLessonFocusFromAction(
    input.topRecommendation ? toRecommendationFollowUpAction(input.topRecommendation) : null
  );
};
