import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { KangurScore } from '@kangur/contracts/kangur';
import {
  HomeDuelSectionsGroup,
  HomeHeroSection,
  HomeTrainingFocusSection,
} from './components';
import { DebugProofSection } from './components/DebugProofSection';
import { HomeInsightsSection } from './components/HomeInsightsSection';
import { HomeStartupContent, type HomeStartupContentProps } from './components/HomeStartupContent';
import {
  HomeHeroLatestLessonCheckpointState,
  type HomeScoreViewModel,
} from './home-screen-score-state';
import { type KangurMobileHomeLessonCheckpointItem } from './useKangurMobileHomeLessonCheckpoints';

type RenderHomeScreenContentProps = HomeStartupContentProps & {
  viewModel: HomeScoreViewModel;
  initialLatestLessonCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  isLiveHomeProgressReady: boolean;
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeHeroDetailsReady: boolean;
  areDeferredHomeHeroIntroReady: boolean;
  homeHeroLearnerName: string | null;
  isLoadingAuth: boolean;
  areDeferredHomeInsightsReady: boolean;
  initialRecentLessonCheckpoints: KangurMobileHomeLessonCheckpointItem[];
  shouldRenderCombinedHomeHeroPlaceholder: boolean;
  activeDuelLearnerId: string | null;
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomeTrainingFocusDetailsReady: boolean;
};

function HomeHeroStatefulSection({
  copy,
  homeHeroFocusHref,
  homeHeroFocusLabel,
  homeHeroLearnerName,
  homeHeroRecentResult,
  isAuthenticated,
  isLoadingAuth,
  recentResultsCount,
  areDeferredHomeHeroDetailsReady,
  areDeferredHomeHeroIntroReady,
  initialLatestLessonCheckpoint,
  isLiveProgressReady,
}: {
  copy: RenderHomeScreenContentProps['copy'];
  homeHeroFocusHref: string | null;
  homeHeroFocusLabel: string | null;
  homeHeroLearnerName: string | null;
  homeHeroRecentResult: KangurScore | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  recentResultsCount: number;
  areDeferredHomeHeroDetailsReady: boolean;
  areDeferredHomeHeroIntroReady: boolean;
  initialLatestLessonCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  isLiveProgressReady: boolean;
}): React.JSX.Element {
  return (
    <HomeHeroLatestLessonCheckpointState
      initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
      isEnabled={areDeferredHomeHeroDetailsReady}
      isLiveProgressReady={isLiveProgressReady}
    >
      {({ homeHeroRecentCheckpoint, homeHeroRecentCheckpointCount }) => (
        <View style={{ gap: 10 }}>
          <HomeHeroSection
            areDeferredHomeHeroDetailsReady={areDeferredHomeHeroDetailsReady}
            areDeferredHomeHeroIntroReady={areDeferredHomeHeroIntroReady}
            copy={copy}
            homeHeroFocusHref={homeHeroFocusHref}
            homeHeroFocusLabel={homeHeroFocusLabel}
            homeHeroLearnerName={homeHeroLearnerName}
            homeHeroRecentCheckpoint={homeHeroRecentCheckpoint}
            homeHeroRecentCheckpointCount={homeHeroRecentCheckpointCount}
            homeHeroRecentResult={homeHeroRecentResult}
            isAuthenticated={isAuthenticated}
            isLoadingAuth={isLoadingAuth}
            recentResultsCount={recentResultsCount}
          />
        </View>
      )}
    </HomeHeroLatestLessonCheckpointState>
  );
}

function HomeSecondaryContent(props: RenderHomeScreenContentProps): React.JSX.Element {
  const {
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
  } = props;
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
      <HomeInsightsSection
        areDeferredHomeInsightsReady={areDeferredHomeInsightsReady}
        initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
        isLiveHomeProgressReady={isLiveHomeProgressReady}
        recentResults={recentResults}
        trainingFocus={trainingFocus}
      />
    </>
  );
}

function HomeScreenMainContent(props: RenderHomeScreenContentProps): React.JSX.Element {
  const {
    copy,
    isLiveHomeProgressReady,
    sessionStatus,
    shouldRenderCombinedHomePrimaryStartupPlaceholder,
    areDeferredHomeHeroDetailsReady,
    areDeferredHomeHeroIntroReady,
    homeHeroLearnerName,
    isLoadingAuth,
    shouldRenderCombinedHomeHeroPlaceholder,
    initialLatestLessonCheckpoint,
    viewModel,
  } = props;
  const { homeDebugProof, homeHeroFocusHref, homeHeroFocusLabel, homeHeroRecentResult, recentResults } = viewModel;

  return (
    <ScrollView
      contentContainerStyle={{ gap: 16, paddingHorizontal: 24, paddingVertical: 28 }}
      keyboardShouldPersistTaps='handled'
    >
      {!shouldRenderCombinedHomePrimaryStartupPlaceholder && !shouldRenderCombinedHomeHeroPlaceholder && (
        <HomeHeroStatefulSection
          areDeferredHomeHeroDetailsReady={areDeferredHomeHeroDetailsReady}
          areDeferredHomeHeroIntroReady={areDeferredHomeHeroIntroReady}
          copy={copy}
          homeHeroFocusHref={homeHeroFocusHref}
          homeHeroFocusLabel={homeHeroFocusLabel}
          homeHeroLearnerName={homeHeroLearnerName}
          homeHeroRecentResult={homeHeroRecentResult}
          initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
          isAuthenticated={sessionStatus === 'authenticated'}
          isLoadingAuth={isLoadingAuth}
          isLiveProgressReady={isLiveHomeProgressReady}
          recentResultsCount={recentResults.results.length}
        />
      )}
      <DebugProofSection copy={copy} homeDebugProof={homeDebugProof} />
      <HomeStartupContent {...props} />
      <HomeSecondaryContent {...props} />
    </ScrollView>
  );
}

export function RenderHomeScreenContent(props: RenderHomeScreenContentProps): React.JSX.Element {
  return (
    <SafeAreaView style={{ backgroundColor: '#fffaf2', flex: 1 }}>
      <HomeScreenMainContent {...props} />
    </SafeAreaView>
  );
}
