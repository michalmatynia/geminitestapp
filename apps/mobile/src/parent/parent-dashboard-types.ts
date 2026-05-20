import type { Href } from 'expo-router';
import type {
  KangurAssignmentSnapshot,
  KangurLearnerProfile,
  KangurScore,
  KangurProgressState,
} from '@kangur/contracts/kangur';
import { type KangurLearnerProfileSnapshot } from '@kangur/core';
import { type UseQueryResult } from '@tanstack/react-query';

export type KangurMobileParentAssignmentMonitoring = {
  completedCount: number;
  highPriorityCount: number;
  inProgressCount: number;
  lessonCount: number;
  notStartedCount: number;
  practiceCount: number;
  totalCount: number;
};

export type KangurMobileParentAssignmentItem = {
  assignment: KangurAssignmentSnapshot;
  href: Href | null;
};

export type UseParentDashboardAssignmentsResult = {
    assignmentsQuery: UseQueryResult<KangurAssignmentSnapshot[], Error>;
    assignmentMonitoring: KangurMobileParentAssignmentMonitoring;
    assignmentItems: KangurMobileParentAssignmentItem[];
};

export type UseParentDashboardProgressResult = {
    progressQuery: UseQueryResult<KangurProgressState, Error>;
    snapshot: KangurLearnerProfileSnapshot | null;
};

export type KangurMobileParentRecentResultItem = {
  historyHref: Href;
  lessonHref: Href | null;
  practiceHref: Href;
  result: KangurScore;
};

export type UseKangurMobileParentDashboardResult = {
  activeLearner: KangurLearnerProfile | null;
  assignmentItems: KangurMobileParentAssignmentItem[];
  assignmentMonitoring: KangurMobileParentAssignmentMonitoring;
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
