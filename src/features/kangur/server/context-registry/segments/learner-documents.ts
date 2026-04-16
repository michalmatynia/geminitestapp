import {
  KANGUR_CONTEXT_ROOT_IDS,
  KANGUR_RUNTIME_ENTITY_TYPES,
} from '@/features/kangur/context-registry/refs';
import { listKangurLoginActivity } from '@/features/kangur/server/kangur-login-activity';
import type {
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type { KangurRegistryBaseData } from '../kangur-registry-types';
import {
  toRecommendationItem,
  toAssignmentItem,
  buildRecentSessionItem,
  buildWeakLessonItem,
} from '../kangur-registry-transformers';
import {
  buildLoginActivitySummary,
} from '../kangur-registry-resolvers';
import { buildLearnerSummary, buildOperationPerformanceItem } from './learner-summaries';
import { loadKangurRegistryBaseData } from './loaders';

export const buildKangurLearnerSnapshotRuntimeDocument = async (input: {
  learnerId: string;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  const topRecommendation = data.snapshot.recommendations[0] ?? null;
  const summary = buildLearnerSummary(data.snapshot, data.activeAssignments, data.masteryInsights);
  return {
    id: `runtime:kangur:learner:${data.learnerId}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.learnerSnapshot,
    title: data.learnerDisplayName
      ? `Kangur learner snapshot: ${data.learnerDisplayName}`
      : `Kangur learner snapshot: ${data.learnerId}`,
    summary,
    status: data.activeAssignments.length > 0 ? 'active' : 'ready',
    tags: ['kangur', 'learner', 'profile', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.learnerSnapshot],
    timestamps: {
      updatedAt: data.snapshot.lastPlayedAt,
    },
    facts: {
      learnerId: data.learnerId,
      displayName: data.learnerDisplayName,
      averageAccuracy: data.snapshot.averageAccuracy,
      todayGames: data.snapshot.todayGames,
      todayXpEarned: data.snapshot.todayXpEarned,
      weeklyXpEarned: data.snapshot.weeklyXpEarned,
      averageXpPerSession: data.snapshot.averageXpPerSession,
      dailyGoalGames: data.snapshot.dailyGoalGames,
      currentStreakDays: data.snapshot.currentStreakDays,
      lessonsCompleted: data.snapshot.lessonsCompleted,
      activeAssignmentCount: data.activeAssignments.length,
      masteredLessons: data.masteryInsights.masteredLessons,
      lessonsNeedingPractice: data.masteryInsights.lessonsNeedingPractice,
      learnerSummary: summary,
      topRecommendationTitle: topRecommendation?.title ?? null,
      topRecommendationDescription: topRecommendation?.description ?? null,
      ...(topRecommendation
        ? {
          topRecommendationActionLabel: topRecommendation.action.label,
          topRecommendationActionPage: topRecommendation.action.page,
          ...(topRecommendation.action.query
            ? { topRecommendationActionQuery: topRecommendation.action.query }
            : {}),
        }
        : {}),
    },
    sections: [
      {
        id: 'recommendations',
        kind: 'items',
        title: 'Recommendations',
        items: data.snapshot.recommendations.slice(0, 3).map(toRecommendationItem),
      },
      {
        id: 'weak_lessons',
        kind: 'items',
        title: 'Weak lesson areas',
        items: data.masteryInsights.weakest.map(buildWeakLessonItem),
      },
      {
        id: 'recent_sessions',
        kind: 'items',
        title: 'Recent practice',
        items: data.snapshot.recentSessions.slice(0, 4).map(buildRecentSessionItem),
      },
      {
        id: 'operation_performance',
        kind: 'items',
        title: 'Performance by operation',
        items: data.snapshot.operationPerformance.slice(0, 6).map(buildOperationPerformanceItem),
      },
      {
        id: 'active_assignments',
        kind: 'items',
        title: 'Active assignments',
        items: data.activeAssignments.slice(0, 4).map((assignment) =>
          toAssignmentItem(assignment, data.snapshot.averageAccuracy)
        ),
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};

export const buildKangurLoginActivityRuntimeDocument = async (input: {
  learnerId: string;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument | null> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  if (!data.ownerUserId) {
    return null;
  }
  const activity = await listKangurLoginActivity({
    ownerUserId: data.ownerUserId,
    learnerId: data.learnerId,
  });
  const lastParentLoginAt = activity.lastParentLogin?.occurredAt ?? null;
  const lastLearnerSignInAt = activity.lastLearnerSignIn?.occurredAt ?? null;
  const summary = buildLoginActivitySummary({
    learnerDisplayName: data.learnerDisplayName,
    parentLoginCount7d: activity.parentLoginCount7d,
    learnerSignInCount7d: activity.learnerSignInCount7d,
    lastParentLoginAt,
    lastLearnerSignInAt,
  });
  return {
    id: `runtime:kangur:login-activity:${data.learnerId}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.loginActivity,
    title: data.learnerDisplayName
      ? `Kangur login activity: ${data.learnerDisplayName}`
      : `Kangur login activity: ${data.learnerId}`,
    summary,
    status: activity.events.length > 0 ? 'active' : 'ready',
    tags: ['kangur', 'login', 'activity', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.loginActivity],
    timestamps: {
      updatedAt: activity.events[0]?.occurredAt ?? null,
    },
    facts: {
      learnerId: data.learnerId,
      ownerUserId: data.ownerUserId,
      learnerDisplayName: data.learnerDisplayName,
      recentLoginActivitySummary: summary,
      lastParentKangurLoginAt: lastParentLoginAt,
      lastParentKangurLoginMethod: activity.lastParentLogin?.loginMethod ?? null,
      lastLearnerSignInAt,
      parentLoginCount7d: activity.parentLoginCount7d,
      learnerSignInCount7d: activity.learnerSignInCount7d,
    },
    sections: [
      {
        id: 'recent_login_activity',
        kind: 'items',
        title: 'Recent Kangur login activity',
        items: activity.events.map((event) => ({
          actorType: event.actorType,
          activityType: event.activityType,
          loginMethod: event.loginMethod,
          occurredAt: event.occurredAt,
          summary: event.summary,
        })),
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};
