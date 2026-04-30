import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { useKangurMobileRecentResults } from '../useKangurMobileRecentResults';
import { useKangurMobileTrainingFocus } from '../useKangurMobileTrainingFocus';
import { createKangurPracticeHref } from '../../practice/practiceHref';
import { PRACTICE_ROUTE } from '../home-screen-constants';
import { formatKangurMobileScoreOperation } from '../../scores/mobileScoreSummary';
import { createHomeDebugProofViewModel } from './debug';
import { type HomeScoreStateProps, type HomeRecentResultsViewModel, type HomeScoreViewModel } from './types';

function resolveRecentResults(
  trainingFocus: ReturnType<typeof useKangurMobileTrainingFocus>,
  cachedRecentResults: ReturnType<typeof useKangurMobileRecentResults>,
): HomeRecentResultsViewModel {
  const hasResolvedHomeScoreInsights =
    trainingFocus.isEnabled &&
    !trainingFocus.isLoading &&
    !trainingFocus.isRestoringAuth &&
    !trainingFocus.error;

  return {
    error: trainingFocus.isEnabled ? trainingFocus.error : cachedRecentResults.error,
    isEnabled: trainingFocus.isEnabled,
    isLoading: trainingFocus.isEnabled
      ? trainingFocus.isLoading
      : cachedRecentResults.isLoading,
    isRestoringAuth: trainingFocus.isEnabled
      ? trainingFocus.isRestoringAuth
      : cachedRecentResults.isRestoringAuth,
    refresh: trainingFocus.isEnabled ? trainingFocus.refresh : cachedRecentResults.refresh,
    results: hasResolvedHomeScoreInsights
      ? trainingFocus.recentResults
      : cachedRecentResults.results,
  };
}

export function LiveAuthenticatedHomeScoreState({
  areDeferredHomePanelsReady,
  areDeferredHomeScoreRefreshReady,
  children,
  debugProofOperation,
}: HomeScoreStateProps & {
  areDeferredHomeScoreRefreshReady: boolean;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const cachedRecentResults = useKangurMobileRecentResults({ enabled: false });
  const trainingFocus = useKangurMobileTrainingFocus({
    enabled: areDeferredHomeScoreRefreshReady,
    recentResultsLimit: 3,
  });

  const recentResults = resolveRecentResults(trainingFocus, cachedRecentResults);
  const homeDebugProof = createHomeDebugProofViewModel({
    isEnabled:
      recentResults.isEnabled &&
      (!areDeferredHomePanelsReady || trainingFocus.isEnabled),
    isLoading:
      recentResults.isLoading ||
      !areDeferredHomePanelsReady ||
      trainingFocus.isLoading,
    locale,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: trainingFocus.strongestOperation,
    weakestOperation: trainingFocus.weakestOperation,
  });

  return (
    <>
      {children({
        homeDebugProof,
        homeHeroFocusHref: trainingFocus.weakestOperation
          ? createKangurPracticeHref(trainingFocus.weakestOperation.operation)
          : PRACTICE_ROUTE,
        homeHeroFocusLabel: trainingFocus.weakestOperation
          ? formatKangurMobileScoreOperation(
              trainingFocus.weakestOperation.operation,
              locale,
            )
          : copy({
              de: 'Gemischtes Training',
              en: 'Mixed practice',
              pl: 'Trening mieszany',
            }),
        homeHeroRecentResult: recentResults.results[0] ?? null,
        recentResults,
        trainingFocus,
      })}
    </>
  );
}
