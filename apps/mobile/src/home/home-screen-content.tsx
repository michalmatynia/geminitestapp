import React from 'react';

import {
  AnonymousHomeScoreState,
  DeferredAuthenticatedHomeScoreState,
  HomeDebugProofOperationState,
  type HomeScoreViewModel,
  LiveAuthenticatedHomeScoreState,
} from './home-screen-score-state';
import { RenderHomeScreenContent } from './RenderHomeScreenContent';
import { useHomeScreenViewModel } from './useHomeScreenViewModel';
import { type KangurMobileHomeLessonCheckpointItem } from './useKangurMobileHomeLessonCheckpoints';

export function HomeScreenContent({
  initialLatestLessonCheckpoint,
  initialRecentLessonCheckpoints,
  isLiveHomeProgressReady,
}: {
  initialLatestLessonCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  initialRecentLessonCheckpoints: KangurMobileHomeLessonCheckpointItem[];
  isLiveHomeProgressReady: boolean;
}): React.JSX.Element {
  const viewModelProps = useHomeScreenViewModel();

  const renderContent = (props: HomeScoreViewModel): React.JSX.Element => (
    <RenderHomeScreenContent
      {...viewModelProps}
      initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
      initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
      isLiveHomeProgressReady={isLiveHomeProgressReady}
      sessionStatus={viewModelProps.session.status as 'authenticated' | 'anonymous'}
      viewModel={props}
    />
  );

  if (viewModelProps.session.status === 'authenticated') {
    return (
      <HomeDebugProofOperationState>
        {(debugProofOperation) => (
          <>
            {!viewModelProps.areDeferredHomeHeroScoresReady ? (
              <DeferredAuthenticatedHomeScoreState
                areDeferredHomePanelsReady={viewModelProps.areDeferredHomePanelsReady}
                debugProofOperation={debugProofOperation}
              >
                {renderContent}
              </DeferredAuthenticatedHomeScoreState>
            ) : (
              <LiveAuthenticatedHomeScoreState
                areDeferredHomePanelsReady={viewModelProps.areDeferredHomePanelsReady}
                areDeferredHomeScoreRefreshReady={viewModelProps.areDeferredHomeScoreRefreshReady}
                debugProofOperation={debugProofOperation}
              >
                {renderContent}
              </LiveAuthenticatedHomeScoreState>
            )}
          </>
        )}
      </HomeDebugProofOperationState>
    );
  }

  return (
    <HomeDebugProofOperationState>
      {(debugProofOperation) => (
        <AnonymousHomeScoreState
          areDeferredHomePanelsReady={viewModelProps.areDeferredHomePanelsReady}
          debugProofOperation={debugProofOperation}
          isRestoringAuth={viewModelProps.isLoadingAuth}
        >
          {renderContent}
        </AnonymousHomeScoreState>
      )}
    </HomeDebugProofOperationState>
  );
}
