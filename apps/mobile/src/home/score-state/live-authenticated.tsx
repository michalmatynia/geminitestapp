import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { useKangurMobileRecentResults } from '../useKangurMobileRecentResults';
import { useKangurMobileTrainingFocus } from '../useKangurMobileTrainingFocus';
import { createKangurPracticeHref } from '../../practice/practiceHref';
import { PRACTICE_ROUTE } from '../home-screen-constants';
import { formatKangurMobileScoreOperation } from '../../scores/mobileScoreSummary';
import { createHomeDebugProofViewModel } from './debug';
import { type HomeScoreStateProps, type HomeRecentResultsViewModel } from './types';

function resolveRecentResults(
  trainingFocus: ReturnType<typeof useKangurMobileTrainingFocus>,
  cachedRecentResults: ReturnType<typeof useKangurMobileRecentResults>,
): HomeRecentResultsViewModel {
  const isEnabled = trainingFocus.isEnabled;
  if (!isEnabled) {
    return {
      error: cachedRecentResults.error,
      isEnabled: false,
      isLoading: cachedRecentResults.isLoading,
      isRestoringAuth: cachedRecentResults.isRestoringAuth,
      refresh: cachedRecentResults.refresh,
      results: cachedRecentResults.results,
    };
  }

  const hasResolvedInsights = !trainingFocus.isLoading && !trainingFocus.isRestoringAuth && (trainingFocus.error === null || trainingFocus.error === '');

  return {
    error: trainingFocus.error,
    isEnabled: true,
    isLoading: trainingFocus.isLoading,
    isRestoringAuth: trainingFocus.isRestoringAuth,
    refresh: trainingFocus.refresh,
    results: hasResolvedInsights ? trainingFocus.recentResults : cachedRecentResults.results,
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
        homeHeroFocusHref: (trainingFocus.weakestOperation !== null)
          ? createKangurPracticeHref(trainingFocus.weakestOperation.operation)
          : PRACTICE_ROUTE,
        homeHeroFocusLabel: (trainingFocus.weakestOperation !== null)
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
