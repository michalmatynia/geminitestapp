import {
  buildKangurLearnerProfileSnapshot,
  type KangurLearnerProfileSnapshot,
} from '@kangur/core';
import type {
  KangurAssignmentSnapshot,
  KangurLearnerProfile,
  KangurProgressState,
  KangurScore,
} from '@kangur/contracts';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { useQuery } from '@tanstack/react-query';
import type { Href } from 'expo-router';
import { useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY } from '../auth/mobileAuthStorageKeys';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  createKangurLessonHref,
  createKangurLessonHrefForPracticeOperation,
} from '../lessons/lessonHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import { useKangurMobileScoreHistory } from '../scores/useKangurMobileScoreHistory';

export type KangurMobileParentAssignmentItem = {
  assignment: KangurAssignmentSnapshot;
  href: Href | null;
};

export type KangurMobileParentRecentResultItem = {
  historyHref: Href;
  lessonHref: Href | null;
  practiceHref: Href;
  result: KangurScore;
};

type UseKangurMobileParentDashboardResult = {
  activeLearner: KangurLearnerProfile | null;
  assignmentItems: KangurMobileParentAssignmentItem[];
  assignmentsError: string | null;
  canAccessDashboard: boolean;
  isAuthenticated: boolean;
  isLoadingAssignments: boolean;
  isLoadingAuth: boolean;
  isLoadingProgress: boolean;
  isLoadingResults: boolean;
  learners: KangurLearnerProfile[];
  parentDisplayName: string;
  progressError: string | null;
  recentResultItems: KangurMobileParentRecentResultItem[];
  refreshDashboard: () => Promise<void>;
  resultsError: string | null;
  selectLearner: (learnerId: string) => Promise<void>;
  selectedLearnerId: string | null;
  selectionError: string | null;
  snapshot: KangurLearnerProfileSnapshot | null;
  supportsLearnerCredentials: boolean;
  switchingLearnerId: string | null;
};

const resolveAssignmentHref = (
  assignment: KangurAssignmentSnapshot,
): Href | null => {
  if (assignment.target.type === 'lesson') {
    return createKangurLessonHref(assignment.target.lessonComponentId);
  }

  if (assignment.target.type === 'practice') {
    return createKangurPracticeHref(assignment.target.operation);
  }

  return null;
};

const getPriorityRank = (priority: KangurAssignmentSnapshot['priority']): number => {
  if (priority === 'high') {
    return 0;
  }

  if (priority === 'medium') {
    return 1;
  }

  return 2;
};

const sortAssignments = (
  assignments: KangurAssignmentSnapshot[],
): KangurAssignmentSnapshot[] =>
  [...assignments].sort((left, right) => {
    const priorityDelta = getPriorityRank(left.priority) - getPriorityRank(right.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });

export const useKangurMobileParentDashboard =
  (): UseKangurMobileParentDashboardResult => {
    const { copy, locale } = useKangurMobileI18n();
    const {
      isLoadingAuth,
      refreshSession,
      session,
      supportsLearnerCredentials,
    } = useKangurMobileAuth();
    const { apiBaseUrl, apiClient, defaultDailyGoalGames, storage } = useKangurMobileRuntime();
    const [selectionError, setSelectionError] = useState<string | null>(null);
    const [switchingLearnerId, setSwitchingLearnerId] = useState<string | null>(null);
    const isAuthenticated = session.status === 'authenticated';
    const canAccessDashboard =
      isAuthenticated && Boolean(session.user?.canManageLearners);
    const learners = session.user?.learners ?? [];
    const activeLearner = session.user?.activeLearner ?? null;
    const selectedLearnerId = activeLearner?.id?.trim() ?? null;

    const progressQuery = useQuery({
      enabled: canAccessDashboard && Boolean(selectedLearnerId),
      queryKey: [
        'kangur-mobile',
        'parent-dashboard',
        'progress',
        apiBaseUrl,
        selectedLearnerId ?? 'none',
      ],
      queryFn: async (): Promise<KangurProgressState> =>
        apiClient.getProgress(undefined, {
          cache: 'no-store',
        }),
      staleTime: 30_000,
    });

    const assignmentsQuery = useQuery({
      enabled: canAccessDashboard && Boolean(selectedLearnerId),
      queryKey: [
        'kangur-mobile',
        'parent-dashboard',
        'assignments',
        apiBaseUrl,
        selectedLearnerId ?? 'none',
      ],
      queryFn: async (): Promise<KangurAssignmentSnapshot[]> =>
        apiClient.listAssignments(
          {
            includeArchived: false,
          },
          {
            cache: 'no-store',
          },
        ),
      staleTime: 30_000,
    });

    const recentResults = useKangurMobileScoreHistory({
      enabled: canAccessDashboard && Boolean(selectedLearnerId),
      limit: 5,
      sort: '-created_date',
    });

    const snapshot = useMemo(() => {
      if (!canAccessDashboard || !selectedLearnerId) {
        return null;
      }

      return buildKangurLearnerProfileSnapshot({
        dailyGoalGames: defaultDailyGoalGames,
        locale,
        progress: progressQuery.data ?? createDefaultKangurProgressState(),
        scores: recentResults.scores,
      });
    }, [
      canAccessDashboard,
      defaultDailyGoalGames,
      locale,
      progressQuery.data,
      recentResults.scores,
      selectedLearnerId,
    ]);

    const recentResultItems = useMemo(
      () =>
        recentResults.scores.map((result) => ({
          historyHref: createKangurResultsHref({
            operation: result.operation,
          }),
          lessonHref: createKangurLessonHrefForPracticeOperation(result.operation),
          practiceHref: createKangurPracticeHref(result.operation),
          result,
        })),
      [recentResults.scores],
    );

    const assignmentItems = useMemo(
      () =>
        sortAssignments(assignmentsQuery.data ?? [])
          .slice(0, 3)
          .map((assignment) => ({
            assignment,
            href: resolveAssignmentHref(assignment),
          })),
      [assignmentsQuery.data],
    );

    return {
      activeLearner,
      assignmentItems,
      assignmentsError:
        assignmentsQuery.error instanceof Error
          ? copy({
              de: 'Die Aufgaben des Lernenden konnten nicht geladen werden.',
              en: 'Could not load learner assignments.',
              pl: 'Nie udało się pobrać zadań ucznia.',
            })
          : null,
      canAccessDashboard,
      isAuthenticated,
      isLoadingAssignments: Boolean(
        canAccessDashboard && selectedLearnerId && assignmentsQuery.isLoading,
      ),
      isLoadingAuth,
      isLoadingProgress: Boolean(
        canAccessDashboard && selectedLearnerId && progressQuery.isLoading,
      ),
      isLoadingResults: recentResults.isLoading,
      learners,
      parentDisplayName:
        session.user?.full_name?.trim() ||
        copy({
          de: 'Elternkonto',
          en: 'Parent account',
          pl: 'Konto rodzica',
        }),
      progressError:
        progressQuery.error instanceof Error
          ? copy({
              de: 'Der Lernfortschritt konnte nicht geladen werden.',
              en: 'Could not load learner progress.',
              pl: 'Nie udało się pobrać postępu ucznia.',
            })
          : null,
      recentResultItems,
      refreshDashboard: async () => {
        await Promise.all([
          canAccessDashboard && selectedLearnerId
            ? progressQuery.refetch()
            : Promise.resolve(),
          canAccessDashboard && selectedLearnerId
            ? assignmentsQuery.refetch()
            : Promise.resolve(),
          canAccessDashboard && selectedLearnerId
            ? recentResults.refresh()
            : Promise.resolve(),
        ]);
      },
      resultsError:
        recentResults.error instanceof Error
          ? copy({
              de: 'Die Ergebnisse des Lernenden konnten nicht geladen werden.',
              en: 'Could not load learner results.',
              pl: 'Nie udało się pobrać wyników ucznia.',
            })
          : recentResults.error,
      selectLearner: async (learnerId: string) => {
        const normalizedLearnerId = learnerId.trim();
        if (!canAccessDashboard || !normalizedLearnerId || normalizedLearnerId === selectedLearnerId) {
          return;
        }

        const previousLearnerId = storage.getItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY);
        setSelectionError(null);
        setSwitchingLearnerId(normalizedLearnerId);

        try {
          storage.setItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY, normalizedLearnerId);
          await refreshSession();
        } catch {
          if (previousLearnerId) {
            storage.setItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY, previousLearnerId);
          } else {
            storage.removeItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY);
          }
          setSelectionError(
            copy({
              de: 'Der aktive Lernende konnte nicht gewechselt werden.',
              en: 'Could not switch the active learner.',
              pl: 'Nie udało się przełączyć aktywnego ucznia.',
            }),
          );
        } finally {
          setSwitchingLearnerId(null);
        }
      },
      selectedLearnerId,
      selectionError,
      snapshot,
      supportsLearnerCredentials,
      switchingLearnerId,
    };
  };
