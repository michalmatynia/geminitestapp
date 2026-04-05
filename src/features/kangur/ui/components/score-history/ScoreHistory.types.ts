import type { KangurScoreRecord } from '@kangur/platform';

export type OperationBreakdown = {
  total: number;
  correct: number;
  count: number;
};

export type ScoreHistoryProps = {
  learnerId?: string | null;
  playerName?: string | null;
  createdBy?: string | null;
  basePath?: string | null;
  prefetchedScores?: KangurScoreRecord[] | null;
  prefetchedLoading?: boolean;
};

export type ScoreHistoryFallbackCopy = {
  byOperationHeading: string;
  emptyDescription: string;
  loadingDescription: string;
  loadingTitle: string;
  recentHeading: string;
  relative: {
    daysAgo: string;
    noActivity: string;
    today: string;
    yesterday: string;
  };
  shared: {
    noData: string;
    operationSummary: string;
  };
  strongest: {
    empty: string;
    label: string;
  };
  summary: {
    averageAccuracy: string;
    perfectGames: string;
    totalGames: string;
  };
  trend: {
    context: {
      down: string;
      flat: string;
      insufficient: string;
      up: string;
    };
    label: string;
    newRange: string;
  };
  weakest: {
    empty: string;
    label: string;
    reviewLesson: string;
  };
  window: {
    lastActivityPrefix: string;
    title: string;
    weeklySessions: string;
    weeklySummary: string;
    weeklyXp: string;
  };
};
