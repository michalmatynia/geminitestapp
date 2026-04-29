export function useHomeScreenPlaceholderViewModel(deferredStates: {
  areDeferredHomeAccountSummaryReady: boolean;
  areDeferredHomeNavigationSecondaryReady: boolean;
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeHeroIntroReady: boolean;
  areDeferredHomeHeroDetailsReady: boolean;
}): {
  shouldRenderCombinedHomeQuickAccessPlaceholder: boolean;
  shouldRenderCombinedHomeStartupPlaceholder: boolean;
  shouldRenderCombinedHomeHeroPlaceholder: boolean;
  shouldRenderCombinedHomePrimaryStartupPlaceholder: boolean;
} {
  const shouldRenderCombinedHomeQuickAccessPlaceholder =
    !deferredStates.areDeferredHomeAccountSummaryReady &&
    !deferredStates.areDeferredHomeNavigationSecondaryReady;

  const shouldRenderCombinedHomeStartupPlaceholder =
    shouldRenderCombinedHomeQuickAccessPlaceholder && !deferredStates.areDeferredHomePanelsReady;

  const shouldRenderCombinedHomeHeroPlaceholder =
    !deferredStates.areDeferredHomeHeroIntroReady && !deferredStates.areDeferredHomeHeroDetailsReady;

  const shouldRenderCombinedHomePrimaryStartupPlaceholder =
    shouldRenderCombinedHomeStartupPlaceholder && shouldRenderCombinedHomeHeroPlaceholder;

  return {
    shouldRenderCombinedHomeQuickAccessPlaceholder,
    shouldRenderCombinedHomeStartupPlaceholder,
    shouldRenderCombinedHomeHeroPlaceholder,
    shouldRenderCombinedHomePrimaryStartupPlaceholder,
  };
}
