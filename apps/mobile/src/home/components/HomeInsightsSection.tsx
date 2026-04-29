import React from 'react';

import type { KangurScore } from '@kangur/contracts/kangur';
import { DeferredHomeInsightsCard } from '../home-screen-deferred';
import { HomeSecondaryInsightsSectionGroup } from '../home-screen-insights';
import { type KangurMobileHomeLessonCheckpointItem } from '../useKangurMobileHomeLessonCheckpoints';

export function HomeInsightsSection({
  areDeferredHomeInsightsReady,
  initialRecentLessonCheckpoints,
  isLiveHomeProgressReady,
  recentResults,
  trainingFocus,
}: {
  areDeferredHomeInsightsReady: boolean;
  initialRecentLessonCheckpoints: KangurMobileHomeLessonCheckpointItem[];
  isLiveHomeProgressReady: boolean;
  recentResults: {
    error: string | null;
    isLoading: boolean;
    isRestoringAuth: boolean;
    results: KangurScore[];
  };
  trainingFocus: { isEnabled: boolean };
}): React.JSX.Element | null {
  if (!areDeferredHomeInsightsReady) return <DeferredHomeInsightsCard />;
  return (
    <HomeSecondaryInsightsSectionGroup
      initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
      isLiveHomeProgressReady={isLiveHomeProgressReady}
      recentResults={{
        error: recentResults.error,
        isDeferred: !trainingFocus.isEnabled,
        isLoading: Boolean(recentResults.isLoading),
        isRestoringAuth: Boolean(recentResults.isRestoringAuth),
        results: recentResults.results,
      }}
    />
  );
}
