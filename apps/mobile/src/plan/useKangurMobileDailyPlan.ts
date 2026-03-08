import type { KangurAssignmentPlan, KangurLearnerRecommendationAction } from '@kangur/core';
import type { KangurScore } from '@kangur/contracts';
import type { Href } from 'expo-router';

import { useKangurMobileRecentResults } from '../home/useKangurMobileRecentResults';
import { useKangurMobileTrainingFocus } from '../home/useKangurMobileTrainingFocus';
import { createKangurLessonHref, createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import { useKangurMobileLearnerProfile } from '../profile/useKangurMobileLearnerProfile';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';

type KangurMobileDailyPlanFocus = {
  historyHref: Href;
  lessonHref: Href | null;
  operation: NonNullable<
    ReturnType<typeof useKangurMobileTrainingFocus>['strongestOperation']
  >;
  practiceHref: Href;
};

type KangurMobileDailyPlanAssignmentItem = {
  assignment: KangurAssignmentPlan;
  href: Href | null;
};

type KangurMobileDailyPlanRecentResultItem = {
  historyHref: Href;
  lessonHref: Href | null;
  practiceHref: Href;
  result: KangurScore;
};

type UseKangurMobileDailyPlanResult = {
  assignmentItems: KangurMobileDailyPlanAssignmentItem[];
  authError: string | null;
  authMode: 'development' | 'learner-session';
  displayName: string;
  getAssignmentHref: (action: KangurLearnerRecommendationAction) => Href | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoading: boolean;
  recentResultItems: KangurMobileDailyPlanRecentResultItem[];
  refresh: () => Promise<void>;
  scoreError: string | null;
  signIn: () => Promise<void>;
  strongestFocus: KangurMobileDailyPlanFocus | null;
  supportsLearnerCredentials: boolean;
  weakestFocus: KangurMobileDailyPlanFocus | null;
};

const createDailyPlanFocus = (
  operation: ReturnType<typeof useKangurMobileTrainingFocus>['strongestOperation'],
  lessonFocus: string | null,
): KangurMobileDailyPlanFocus | null => {
  if (!operation) {
    return null;
  }

  return {
    historyHref: createKangurResultsHref({
      operation: operation.operation,
    }),
    lessonHref: lessonFocus ? createKangurLessonHref(lessonFocus) : null,
    operation,
    practiceHref: createKangurPracticeHref(operation.operation),
  };
};

export const useKangurMobileDailyPlan =
  (): UseKangurMobileDailyPlanResult => {
    const profile = useKangurMobileLearnerProfile();
    const recentResults = useKangurMobileRecentResults();
    const trainingFocus = useKangurMobileTrainingFocus();

    return {
      assignmentItems: profile.assignments.slice(0, 3).map((assignment) => ({
        assignment,
        href: profile.getActionHref(assignment.action),
      })),
      authError: profile.authError,
      authMode: profile.authMode,
      displayName: profile.displayName,
      getAssignmentHref: profile.getActionHref,
      isAuthenticated: profile.isAuthenticated,
      isLoadingAuth: profile.isLoadingAuth,
      isLoading:
        profile.isLoadingAuth ||
        profile.isLoadingScores ||
        recentResults.isLoading ||
        trainingFocus.isLoading,
      recentResultItems: recentResults.results.map((result) => ({
        historyHref: createKangurResultsHref({
          operation: result.operation,
        }),
        lessonHref: createKangurLessonHrefForPracticeOperation(result.operation),
        practiceHref: createKangurPracticeHref(result.operation),
        result,
      })),
      refresh: async () => {
        await Promise.all([
          profile.refreshScores(),
          recentResults.refresh(),
          trainingFocus.refresh(),
        ]);
      },
      scoreError:
        trainingFocus.error ??
        recentResults.error ??
        profile.scoresError ??
        null,
      signIn: profile.signIn,
      strongestFocus: createDailyPlanFocus(
        trainingFocus.strongestOperation,
        trainingFocus.strongestLessonFocus,
      ),
      supportsLearnerCredentials: profile.supportsLearnerCredentials,
      weakestFocus: createDailyPlanFocus(
        trainingFocus.weakestOperation,
        trainingFocus.weakestLessonFocus,
      ),
    };
  };
