import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { PRACTICE_ROUTE } from '../home-screen-constants';
import { createHomeDebugProofViewModel } from './debug';
import { type HomeScoreStateProps, type HomeRecentResultsViewModel, type HomeTrainingFocusViewModel, noopRefreshHomeScoreViewModel } from './types';

export function DeferredAuthenticatedHomeScoreState({
  areDeferredHomePanelsReady,
  children,
  debugProofOperation,
}: HomeScoreStateProps): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const recentResults = {
    error: null,
    isEnabled: false,
    isLoading: false,
    isRestoringAuth: false,
    refresh: noopRefreshHomeScoreViewModel,
    results: [],
  } satisfies HomeRecentResultsViewModel;
  const trainingFocus = {
    error: null,
    isEnabled: false,
    isLoading: false,
    isRestoringAuth: false,
    recentResults: [],
    refresh: noopRefreshHomeScoreViewModel,
    strongestLessonFocus: null,
    strongestOperation: null,
    weakestLessonFocus: null,
    weakestOperation: null,
  } satisfies HomeTrainingFocusViewModel;
  const homeDebugProof = createHomeDebugProofViewModel({
    isEnabled: false,
    isLoading: !areDeferredHomePanelsReady,
    locale,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: null,
    weakestOperation: null,
  });

  return (
    <>
      {children({
        homeDebugProof,
        homeHeroFocusHref: PRACTICE_ROUTE,
        homeHeroFocusLabel: copy({
          de: 'Gemischtes Training',
          en: 'Mixed practice',
          pl: 'Trening mieszany',
        }),
        homeHeroRecentResult: null,
        recentResults,
        trainingFocus,
      })}
    </>
  );
}

export function AnonymousHomeScoreState({
  areDeferredHomePanelsReady,
  children,
  debugProofOperation,
  isRestoringAuth,
}: HomeScoreStateProps & {
  isRestoringAuth: boolean;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const recentResults = {
    error: null,
    isEnabled: false,
    isLoading: isRestoringAuth,
    isRestoringAuth,
    refresh: noopRefreshHomeScoreViewModel,
    results: [],
  } satisfies HomeRecentResultsViewModel;
  const trainingFocus = {
    error: null,
    isEnabled: false,
    isLoading: isRestoringAuth,
    isRestoringAuth,
    recentResults: [],
    refresh: noopRefreshHomeScoreViewModel,
    strongestLessonFocus: null,
    strongestOperation: null,
    weakestLessonFocus: null,
    weakestOperation: null,
  } satisfies HomeTrainingFocusViewModel;
  const homeDebugProof = createHomeDebugProofViewModel({
    isEnabled: false,
    isLoading:
      recentResults.isLoading ||
      !areDeferredHomePanelsReady ||
      trainingFocus.isLoading,
    locale,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: null,
    weakestOperation: null,
  });

  return (
    <>
      {children({
        homeDebugProof,
        homeHeroFocusHref: PRACTICE_ROUTE,
        homeHeroFocusLabel: copy({
          de: 'Gemischtes Training',
          en: 'Mixed practice',
          pl: 'Trening mieszany',
        }),
        homeHeroRecentResult: null,
        recentResults,
        trainingFocus,
      })}
    </>
  );
}
