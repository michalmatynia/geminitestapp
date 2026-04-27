import {
  DeferredHomeInsightsBadgesAndPlanCard,
  DeferredHomeInsightsBadgesCard,
  DeferredHomeInsightsBadgesDetailsCard,
  DeferredHomeInsightsPlanAssignmentsCard,
  DeferredHomeInsightsPlanCard,
  DeferredHomeInsightsPlanDetailsCard,
  DeferredHomeInsightsResultsHubCard,
} from '../home-screen-secondary-deferred';
import {
  useHomeScreenDeferredPanelSequence,
} from '../useHomeScreenDeferredPanels';
import {
  HOME_BADGES_PANEL_SEQUENCE,
  HOME_PLAN_PANEL_SEQUENCE,
} from '../home-screen-constants';
import { HomeSecondaryInsightsBadgesSectionGroup } from './HomeSecondaryInsightsBadgesSectionGroup';
import { HomeSecondaryInsightsPlanSection } from './HomeSecondaryInsightsPlanSection';

export function HomeSecondaryInsightsBadgesAndPlanSectionGroup(): React.JSX.Element {
  const [
    areDeferredHomeInsightBadgesReady,
    areDeferredHomeInsightBadgesDetailsReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_BADGES_PANEL_SEQUENCE, false);
  const [
    areDeferredHomeInsightPlanReady,
    areDeferredHomeInsightPlanDetailsReady,
    areDeferredHomeInsightPlanAssignmentsReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_PLAN_PANEL_SEQUENCE, false);

  return (
    <>
      {!areDeferredHomeInsightBadgesReady ? (
        <DeferredHomeInsightsBadgesCard />
      ) : !areDeferredHomeInsightBadgesDetailsReady ? (
        <DeferredHomeInsightsBadgesDetailsCard />
      ) : (
        <HomeSecondaryInsightsBadgesSectionGroup />
      )}
      {!areDeferredHomeInsightPlanReady ? (
        <DeferredHomeInsightsPlanCard />
      ) : !areDeferredHomeInsightPlanDetailsReady ? (
        <DeferredHomeInsightsPlanDetailsCard />
      ) : !areDeferredHomeInsightPlanAssignmentsReady ? (
        <DeferredHomeInsightsPlanAssignmentsCard />
      ) : (
        <HomeSecondaryInsightsPlanSection />
      )}
    </>
  );
}
