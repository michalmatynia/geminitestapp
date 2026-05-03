import {
  HOME_ACCOUNT_DETAILS_PANEL_GROUP,
  HOME_DUEL_PANEL_SEQUENCE,
  HOME_INSIGHT_SCORE_REFRESH_SEQUENCE,
  HOME_NAVIGATION_PANEL_SEQUENCE,
  HOME_PRIMARY_SURFACE_PANEL_GROUP,
  HOME_SCORE_DETAILS_PANEL_GROUP,
} from './home-screen-constants';
import {
  useHomeScreenDeferredPanelGroup,
  useHomeScreenDeferredPanelSequence,
} from './useHomeScreenDeferredPanels';

export function useHomeScreenDeferredStates(): {
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeInsightsReady: boolean;
  areDeferredHomeScoreRefreshReady: boolean;
  areDeferredHomeHeroScoresReady: boolean;
  areDeferredHomeTrainingFocusDetailsReady: boolean;
  areDeferredHomeHeroIntroReady: boolean;
  areDeferredHomeHeroDetailsReady: boolean;
  areDeferredHomeAccountSummaryReady: boolean;
  areDeferredHomeAccountDetailsReady: boolean;
  areDeferredHomeAccountSignInReady: boolean;
  areDeferredHomeNavigationSecondaryReady: boolean;
  areDeferredHomeNavigationExtendedReady: boolean;
} {
  const [
    areDeferredHomePanelsReady, areDeferredHomeDuelSecondaryReady,
    areDeferredHomeDuelInvitesReady, areDeferredHomeDuelAdvancedReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_DUEL_PANEL_SEQUENCE, false);
  const [areDeferredHomeInsightsReady, areDeferredHomeScoreRefreshReady] =
    useHomeScreenDeferredPanelSequence(HOME_INSIGHT_SCORE_REFRESH_SEQUENCE, !areDeferredHomePanelsReady);
  const [areDeferredHomeHeroScoresReady, areDeferredHomeTrainingFocusDetailsReady] =
    useHomeScreenDeferredPanelGroup(HOME_SCORE_DETAILS_PANEL_GROUP, !areDeferredHomePanelsReady);
  const [areDeferredHomeHeroIntroReady, areDeferredHomeHeroDetailsReady, areDeferredHomeAccountSummaryReady] =
    useHomeScreenDeferredPanelGroup(HOME_PRIMARY_SURFACE_PANEL_GROUP, false);
  const [areDeferredHomeAccountDetailsReady, areDeferredHomeAccountSignInReady] =
    useHomeScreenDeferredPanelGroup(HOME_ACCOUNT_DETAILS_PANEL_GROUP, !areDeferredHomeAccountSummaryReady);
  const [areDeferredHomeNavigationSecondaryReady, areDeferredHomeNavigationExtendedReady] =
    useHomeScreenDeferredPanelSequence(HOME_NAVIGATION_PANEL_SEQUENCE, false);

  return {
    areDeferredHomePanelsReady, areDeferredHomeDuelSecondaryReady,
    areDeferredHomeDuelInvitesReady, areDeferredHomeDuelAdvancedReady,
    areDeferredHomeInsightsReady, areDeferredHomeScoreRefreshReady,
    areDeferredHomeHeroScoresReady, areDeferredHomeTrainingFocusDetailsReady,
    areDeferredHomeHeroIntroReady, areDeferredHomeHeroDetailsReady,
    areDeferredHomeAccountSummaryReady, areDeferredHomeAccountDetailsReady,
    areDeferredHomeAccountSignInReady, areDeferredHomeNavigationSecondaryReady,
    areDeferredHomeNavigationExtendedReady,
  };
}
