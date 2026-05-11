import {
  DeferredHomeInsightsBadgesAndPlanCard,
  DeferredHomeInsightsResultsHubCard,
} from '../home-screen-secondary-deferred';
import {
  useHomeScreenDeferredPanelGroup,
} from '../useHomeScreenDeferredPanels';
import {
  HOME_INSIGHTS_EXTRAS_PANEL_GROUP,
} from '../home-screen-constants';
import { HomeSecondaryInsightsBadgesAndPlanSectionGroup } from './HomeSecondaryInsightsBadgesAndPlanSectionGroup';
import { HomeResultsHubSection } from './HomeResultsHubSection';
import type { KangurScore } from '@kangur/contracts/kangur';

type HomeRecentResultsSectionProps = {
  recentResults: {
    error: string | null;
    isDeferred: boolean;
    isLoading: boolean;
    isRestoringAuth: boolean;
    results: KangurScore[];
  };
};

export function HomeSecondaryInsightsExtrasSectionGroup({
  recentResults,
}: HomeRecentResultsSectionProps): React.JSX.Element {
  const [
    areDeferredHomeInsightBadgesAndPlanReady,
    areDeferredHomeInsightResultsSummaryReady,
  ] = useHomeScreenDeferredPanelGroup(HOME_INSIGHTS_EXTRAS_PANEL_GROUP, false);

  return (
    <>
      {!areDeferredHomeInsightBadgesAndPlanReady ? (
        <DeferredHomeInsightsBadgesAndPlanCard />
      ) : (
        <HomeSecondaryInsightsBadgesAndPlanSectionGroup />
      )}
      {!areDeferredHomeInsightResultsSummaryReady ? (
        <DeferredHomeInsightsResultsHubCard />
      ) : (
        <HomeResultsHubSection recentResults={recentResults} />
      )}
    </>
  );
}
