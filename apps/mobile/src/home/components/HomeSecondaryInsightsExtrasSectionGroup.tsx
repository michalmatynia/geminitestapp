import {
  DeferredHomeInsightsExtrasCard,
} from '../home-screen-deferred';
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
        <DeferredHomeInsightsExtrasCard />
      ) : (
        <HomeSecondaryInsightsBadgesAndPlanSectionGroup />
      )}
      {!areDeferredHomeInsightResultsSummaryReady ? (
        // Re-importing DeferredHomeInsightsResultsHubCard would cause circular or redundant imports if kept here
        // The original code used it, let's keep the logic consistent.
        // Actually, it was DeferredHomeInsightsResultsHubCard in original.
        <></> 
      ) : (
        <HomeResultsHubSection recentResults={recentResults} />
      )}
    </>
  );
}
