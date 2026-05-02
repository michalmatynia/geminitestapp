import {
  DeferredHomeInsightsBadgesCard,
  DeferredHomeInsightsBadgesDetailsCard,
  DeferredHomeInsightsPlanAssignmentsCard,
  DeferredHomeInsightsPlanCard,
  DeferredHomeInsightsPlanDetailsCard,
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

  let badgesContent: React.JSX.Element;
  if (!areDeferredHomeInsightBadgesReady) {
    badgesContent = <DeferredHomeInsightsBadgesCard />;
  } else if (!areDeferredHomeInsightBadgesDetailsReady) {
    badgesContent = <DeferredHomeInsightsBadgesDetailsCard />;
  } else {
    badgesContent = <HomeSecondaryInsightsBadgesSectionGroup />;
  }

  let planContent: React.JSX.Element;
  if (!areDeferredHomeInsightPlanReady) {
    planContent = <DeferredHomeInsightsPlanCard />;
  } else if (!areDeferredHomeInsightPlanDetailsReady) {
    planContent = <DeferredHomeInsightsPlanDetailsCard />;
  } else if (!areDeferredHomeInsightPlanAssignmentsReady) {
    planContent = <DeferredHomeInsightsPlanAssignmentsCard />;
  } else {
    planContent = <HomeSecondaryInsightsPlanSection />;
  }

  return (
    <>
      {badgesContent}
      {planContent}
    </>
  );
}
