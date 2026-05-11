import React from 'react';

import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { type KangurMobileHomeLessonCheckpointItem } from '../useKangurMobileHomeLessonCheckpoints';
import { type HomeScoreViewModel } from '../home-screen-score-state';
import { HomeDuelSectionsGroup } from './duels/HomeDuelSectionsGroup';
import { HomeTrainingFocusSection } from './HomeTrainingFocusSection';
import { HomeInsightsSection } from './HomeInsightsSection';

export type HomeSecondaryContentProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  sessionStatus: 'authenticated' | 'anonymous';
  areDeferredHomePanelsReady: boolean;
  initialRecentLessonCheckpoints: KangurMobileHomeLessonCheckpointItem[];
  isLiveHomeProgressReady: boolean;
  areDeferredHomeInsightsReady: boolean;
  activeDuelLearnerId: string | null;
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomeTrainingFocusDetailsReady: boolean;
  shouldRenderCombinedHomeStartupPlaceholder: boolean;
  viewModel: HomeScoreViewModel;
};

export function HomeSecondaryContent({
  copy,
  sessionStatus,
  areDeferredHomePanelsReady,
  initialRecentLessonCheckpoints,
  isLiveHomeProgressReady,
  areDeferredHomeInsightsReady,
  activeDuelLearnerId,
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomeDuelInvitesReady,
  areDeferredHomeDuelSecondaryReady,
  areDeferredHomeTrainingFocusDetailsReady,
  shouldRenderCombinedHomeStartupPlaceholder,
  viewModel,
}: HomeSecondaryContentProps): React.JSX.Element {
  const { recentResults, trainingFocus } = viewModel;

  return (
    <>
      <HomeDuelSectionsGroup
        activeDuelLearnerId={activeDuelLearnerId}
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
        areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        copy={copy}
        isAuthenticated={sessionStatus === 'authenticated'}
        shouldRenderCombinedHomeStartupPlaceholder={shouldRenderCombinedHomeStartupPlaceholder}
      />
      <HomeTrainingFocusSection
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        areDeferredHomeTrainingFocusDetailsReady={areDeferredHomeTrainingFocusDetailsReady}
        copy={copy}
        trainingFocus={trainingFocus}
      />
      {!shouldRenderCombinedHomeStartupPlaceholder ? (
        <HomeInsightsSection
          areDeferredHomeInsightsReady={areDeferredHomeInsightsReady}
          initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
          isLiveHomeProgressReady={isLiveHomeProgressReady}
          recentResults={recentResults}
          trainingFocus={trainingFocus}
        />
      ) : null}
    </>
  );
}
