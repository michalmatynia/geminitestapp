import 'server-only';

import { getKangurAssignmentRepository, getKangurProgressRepository, getKangurScoreRepository } from '@/features/kangur/server';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import {
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
} from '@/features/kangur/ui/services/profile';
import type {
  ContextRegistryResolutionBundle,
} from '@/shared/contracts/ai-context-registry';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorLearnerMemory,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import {
  appendCoachingFrameInstructions,
  buildKangurAiTutorCoachingFrame,
} from './ai-tutor-coaching-frame';
import {
  KANGUR_AI_TUTOR_DAILY_GOAL_GAMES,
  KANGUR_AI_TUTOR_RECENT_SCORE_LIMIT,
} from '@/features/kangur/server/ai-tutor-adaptive/adaptive.constants';
import {
  matchesLessonComponent,
  parseCompletedFollowUp,
} from '@/features/kangur/server/ai-tutor-adaptive/adaptive.utils';
import {
  sortAssignments,
  buildOrderedAssignmentCandidates,
  pickRelevantWeakLesson,
  pickFreshCandidate,
  toAssignmentFollowUpAction,
  toRecommendationFollowUpAction,
  buildCompletedFollowUpBridgeAction,
  buildFollowUpActions,
  formatRecommendation,
  formatAssignmentSummary,
} from '@/features/kangur/server/ai-tutor-adaptive/adaptive.recommendations';
import type { KangurAiTutorAdaptiveGuidance } from '@/features/kangur/server/ai-tutor-adaptive/adaptive.contracts';
import { buildAdaptiveGuidanceFromRegistry } from '@/features/kangur/server/ai-tutor-adaptive/adaptive.registry';
import { resolveLessonFocusFromAdaptiveSnapshot } from '@/features/kangur/server/ai-tutor-adaptive/adaptive.recommendations-logic';

export async function buildKangurAiTutorAdaptiveGuidance({
  learnerId,
  context,
  registryBundle,
  memory,
}: {
  learnerId: string;
  context?: KangurAiTutorConversationContext;
  registryBundle?: ContextRegistryResolutionBundle | null;
  memory?: KangurAiTutorLearnerMemory | null;
}): Promise<KangurAiTutorAdaptiveGuidance> {
  try {
    if (registryBundle?.documents.length) {
      return buildAdaptiveGuidanceFromRegistry({
        context,
        registryBundle,
        memory,
      });
    }

    const [progressRepository, scoreRepository, assignmentRepository] = await Promise.all([
      getKangurProgressRepository(),
      getKangurScoreRepository(),
      getKangurAssignmentRepository(),
    ]);

    const [progress, scores, assignments]: [any, any, any] = await Promise.all([
      progressRepository.getProgress(learnerId),
      scoreRepository.listScores({
        sort: '-created_date',
        limit: KANGUR_AI_TUTOR_RECENT_SCORE_LIMIT,
        filters: {
          learner_id: learnerId,
        },
      }),
      assignmentRepository.listAssignments({
        learnerKey: learnerId,
        includeArchived: false,
      }),
    ]);

    const snapshot = buildKangurLearnerProfileSnapshot({
      progress,
      scores,
      dailyGoalGames: KANGUR_AI_TUTOR_DAILY_GOAL_GAMES,
    });
    const masteryInsights = buildLessonMasteryInsights(progress, 2);
    const activeAssignments = assignments
      .map((assignment: any) =>
        evaluateKangurAssignment({
          assignment,
          progress,
          scores,
        })
      )
      .filter((assignment: any) => !assignment.archived && assignment.progress.status !== 'completed')
      .sort(sortAssignments);
    const completedFollowUp = parseCompletedFollowUp(memory);
    const orderedAssignments = buildOrderedAssignmentCandidates(activeAssignments, context);

    const relevantWeakLesson = pickRelevantWeakLesson(masteryInsights.weakest, context);
    const topRecommendation = pickFreshCandidate(
      snapshot.recommendations,
      toRecommendationFollowUpAction,
      completedFollowUp
    );
    const relevantAssignment = pickFreshCandidate(
      orderedAssignments,
      (assignment) =>
        toAssignmentFollowUpAction(assignment, snapshot.averageAccuracy),
      completedFollowUp
    );
    const latestSession = snapshot.recentSessions[0] ?? null;
    const lines: string[] = [];
    const weakMasteryPercent = relevantWeakLesson?.masteryPercent ?? 100;
    const previousCoachingMode = context?.previousCoachingMode ?? memory?.lastCoachingMode ?? null;
    const coachingFrame = buildKangurAiTutorCoachingFrame({
      context,
      averageAccuracy: snapshot.averageAccuracy,
      weakMasteryPercent,
      previousCoachingMode,
    });
    const bridgeAction = buildCompletedFollowUpBridgeAction({
      completedFollowUp,
      lessonFocus: resolveLessonFocusFromAdaptiveSnapshot({
        context,
        relevantWeakLesson,
        relevantAssignment,
        topRecommendation,
        averageAccuracy: snapshot.averageAccuracy,
      }),
      averageAccuracy: snapshot.averageAccuracy,
    });
    const followUpActions = buildFollowUpActions({
      context,
      bridgeAction,
      relevantAssignment,
      topRecommendation,
      averageAccuracy: snapshot.averageAccuracy,
      coachingMode: coachingFrame.mode,
      completedFollowUp,
    });
    const repeatedQuestionCount = context?.repeatedQuestionCount ?? 0;
    const recentHintRecoverySignal = context?.recentHintRecoverySignal ?? null;

    lines.push(
      `Adaptive learner snapshot: average accuracy ${snapshot.averageAccuracy}%, daily goal ${snapshot.todayGames}/${snapshot.dailyGoalGames}, +${snapshot.todayXpEarned} XP today, +${snapshot.weeklyXpEarned} XP in the last 7 days, streak ${snapshot.currentStreakDays} days.`
    );

    if (relevantWeakLesson) {
      lines.push(
        matchesLessonComponent(relevantWeakLesson.componentId, [context?.contentId, context?.focusId])
          ? `Current lesson is a weaker area: ${relevantWeakLesson.title} at ${relevantWeakLesson.masteryPercent}% mastery.`
          : `Weak lesson area: ${relevantWeakLesson.title} at ${relevantWeakLesson.masteryPercent}% mastery.`
      );
    }

    if (latestSession) {
      lines.push(
        latestSession.xpEarned !== null
          ? `Most recent practice: ${latestSession.operationLabel} at ${latestSession.accuracyPercent}% accuracy for +${latestSession.xpEarned} XP.`
          : `Most recent practice: ${latestSession.operationLabel} at ${latestSession.accuracyPercent}% accuracy.`
      );
    }

    if (topRecommendation) {
      lines.push(`Top adaptive recommendation: ${formatRecommendation(topRecommendation)}`);
    }

    if (relevantAssignment) {
      lines.push(`Relevant active assignment: ${formatAssignmentSummary(relevantAssignment)}`);
    }

    if (repeatedQuestionCount > 0) {
      lines.push(
        `Repeat signal: the learner has repeated essentially the same question ${repeatedQuestionCount + 1} times in this tutor thread, so switch strategy instead of repeating the same hint.`
      );
    }
    if (recentHintRecoverySignal === 'answer_revealed') {
      lines.push(
        'Hint recovery signal: the learner reached review after the previous hint. Reflect on what happened, then name one specific adjustment.'
      );
    } else if (recentHintRecoverySignal === 'focus_advanced') {
      lines.push(
        'Hint recovery signal: the learner moved forward after the previous hint. Confirm the progress and point to one concrete next step.'
      );
    }
    if (previousCoachingMode && repeatedQuestionCount > 0) {
      lines.push(
        `Previous coaching mode was ${previousCoachingMode}, so avoid repeating it unchanged while the learner is still blocked.`
      );
    }
    if (completedFollowUp) {
      lines.push(
        'Completed tutor follow-up in this thread: the learner already carried out the previous recommended action, so avoid repeating the same next step unless there is a clear new reason.'
      );
      if (bridgeAction) {
        lines.push(
          `Successful follow-up signal: build on that completion with one adjacent next move: ${bridgeAction.label}${bridgeAction.reason ? ` (${bridgeAction.reason})` : ''}.`
        );
      }
    }

    if (
      snapshot.averageAccuracy < 70 ||
      weakMasteryPercent < 60
    ) {
      lines.push(
        'Adaptive tutoring stance: use smaller reasoning steps, ask one checkpoint question at a time, and confirm understanding before moving on.'
      );
    } else if (snapshot.averageAccuracy >= 85) {
      lines.push(
        'Adaptive tutoring stance: keep hints concise, let the learner do more of the work, and use challenge-style follow-up questions.'
      );
    }
    appendCoachingFrameInstructions(lines, coachingFrame);

    if (context?.interactionIntent === 'next_step') {
      lines.push(
        bridgeAction
          ? 'When suggesting the next step, build on the completed tutor follow-up and give exactly one adjacent Kangur action.'
          : relevantAssignment
            ? `When suggesting the next step, anchor it to this assignment and give exactly one concrete Kangur action: ${relevantAssignment.title}.`
            : topRecommendation
              ? 'When suggesting the next step, anchor it to the top recommendation and give exactly one concrete Kangur action.'
              : 'When suggesting the next step, give exactly one concrete Kangur action that targets the weakest area.'
      );
    }

    if (context?.interactionIntent === 'review' && latestSession) {
      lines.push(
        `When reviewing mistakes, connect the explanation to the learner's recent ${latestSession.operationLabel} result and point out one thing to retry next.`
      );
    }

    return {
      instructions: lines.join('\n'),
      followUpActions,
      coachingFrame,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.ai-tutor',
      action: 'buildAdaptiveGuidance',
      learnerId,
      surface: context?.surface,
      contentId: context?.contentId,
      interactionIntent: context?.interactionIntent,
    });
    return {
      instructions: '',
      followUpActions: [],
      coachingFrame: null,
    };
  }
}

export async function buildKangurAiTutorAdaptiveInstructions(input: {
  learnerId: string;
  context?: KangurAiTutorConversationContext;
  registryBundle?: ContextRegistryResolutionBundle | null;
}): Promise<string> {
  const guidance = await buildKangurAiTutorAdaptiveGuidance(input);
  return guidance.instructions;
}
