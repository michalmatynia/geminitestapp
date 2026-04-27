import { View } from 'react-native';

import type { KangurMobileHomeLessonCheckpointItem } from './useKangurMobileHomeLessonCheckpoints';
import {
  DeferredHomeInsightsLessonPlanCard,
  DeferredHomeInsightsExtrasCard,
} from './home-screen-deferred';
import {
  useHomeScreenDeferredPanelGroup,
} from './useHomeScreenDeferredPanels';
import {
  HOME_INSIGHTS_SECTION_PANEL_GROUP,
} from './home-screen-constants';
import type { KangurScore } from '@kangur/contracts/kangur';

import { HomeSecondaryLessonPlanSection } from './components/HomeSecondaryLessonPlanSection';
import { HomeSecondaryRecentLessonsSection } from './components/HomeSecondaryRecentLessonsSection';
import { HomeSecondaryInsightsExtrasSectionGroup } from './components/HomeSecondaryInsightsExtrasSectionGroup';
import { useKangurMobileHomeLessonCheckpoints } from './useKangurMobileHomeLessonCheckpoints';

type HomeRecentResultsSectionProps = {
  recentResults: {
    error: string | null;
    isDeferred: boolean;
    isLoading: boolean;
    isRestoringAuth: boolean;
    results: KangurScore[];
  };
};

type HomeSecondaryInsightsSectionGroupProps = HomeRecentResultsSectionProps & {
  initialRecentLessonCheckpoints: KangurMobileHomeLessonCheckpointItem[];
  isLiveHomeProgressReady: boolean;
};

function LiveHomeSecondaryRecentLessonsSection(): React.JSX.Element {
  const lessonCheckpoints = useKangurMobileHomeLessonCheckpoints();

  return (
    <HomeSecondaryRecentLessonsSection
      recentCheckpoints={lessonCheckpoints.recentCheckpoints}
    />
  );
}

export function HomeSecondaryInsightsSectionGroup({
  initialRecentLessonCheckpoints,
  isLiveHomeProgressReady,
  recentResults,
}: HomeSecondaryInsightsSectionGroupProps): React.JSX.Element {
  const [areDeferredHomeInsightLessonsReady, areDeferredHomeInsightExtrasReady] =
    useHomeScreenDeferredPanelGroup(HOME_INSIGHTS_SECTION_PANEL_GROUP, false);
  const shouldRenderLiveHomeLessonInsights =
    isLiveHomeProgressReady && areDeferredHomeInsightLessonsReady;

  return (
    <>
      {shouldRenderLiveHomeLessonInsights ? (
        <HomeSecondaryLessonPlanSection />
      ) : (
        <DeferredHomeInsightsLessonPlanCard />
      )}

      {shouldRenderLiveHomeLessonInsights ? (
        <LiveHomeSecondaryRecentLessonsSection />
      ) : (
        <HomeSecondaryRecentLessonsSection
          recentCheckpoints={initialRecentLessonCheckpoints}
        />
      )}

      {!areDeferredHomeInsightExtrasReady ? (
        <DeferredHomeInsightsExtrasCard />
      ) : (
        <HomeSecondaryInsightsExtrasSectionGroup recentResults={recentResults} />
      )}
    </>
  );
}
