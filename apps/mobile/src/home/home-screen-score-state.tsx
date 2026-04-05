import { type Href, useLocalSearchParams } from 'expo-router';

import type { KangurScore } from '@kangur/contracts/kangur';
import {
  buildKangurHomeDebugProofViewModel,
  resolveKangurHomeDebugProofOperation,
} from './homeDebugProof';
import {
  type KangurMobileHomeLessonCheckpointItem,
  useKangurMobileHomeLessonCheckpoints,
} from './useKangurMobileHomeLessonCheckpoints';
import { useKangurMobileRecentResults } from './useKangurMobileRecentResults';
import { useKangurMobileTrainingFocus } from './useKangurMobileTrainingFocus';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurPracticeHref } from '../practice/practiceHref';
import {
  formatKangurMobileScoreOperation,
  type KangurMobileOperationPerformance,
} from '../scores/mobileScoreSummary';
import { PRACTICE_ROUTE } from './home-screen-constants';

export type HomeRecentResultsViewModel = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
  results: KangurScore[];
};

export type HomeTrainingFocusViewModel = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  recentResults: KangurScore[];
  refresh: () => Promise<void>;
  strongestLessonFocus: string | null;
  strongestOperation: KangurMobileOperationPerformance | null;
  weakestLessonFocus: string | null;
  weakestOperation: KangurMobileOperationPerformance | null;
};

export type HomeScoreViewModel = {
  homeDebugProof: ReturnType<typeof buildKangurHomeDebugProofViewModel>;
  homeHeroFocusHref: Href;
  homeHeroFocusLabel: string;
  homeHeroRecentResult: KangurScore | null;
  recentResults: HomeRecentResultsViewModel;
  trainingFocus: HomeTrainingFocusViewModel;
};

type HomeScoreStateProps = {
  areDeferredHomePanelsReady: boolean;
  children: (viewModel: HomeScoreViewModel) => React.ReactNode;
  debugProofOperation: string | null;
};

type HomeHeroLatestLessonCheckpointViewModel = {
  homeHeroRecentCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  homeHeroRecentCheckpointCount: number;
};

type HomeHeroLatestLessonCheckpointStateProps = {
  children: (viewModel: HomeHeroLatestLessonCheckpointViewModel) => React.ReactNode;
  isEnabled: boolean;
  initialLatestLessonCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  isLiveProgressReady: boolean;
};

const noopRefreshHomeScoreViewModel = async (): Promise<void> => {};

function LiveHomeHeroLatestLessonCheckpointState({
  children,
}: Pick<HomeHeroLatestLessonCheckpointStateProps, 'children'>): React.JSX.Element {
  const latestLessonCheckpoint = useKangurMobileHomeLessonCheckpoints({
    limit: 1,
  });

  return (
    <>
      {children({
        homeHeroRecentCheckpoint: latestLessonCheckpoint.recentCheckpoints[0] ?? null,
        homeHeroRecentCheckpointCount: latestLessonCheckpoint.recentCheckpoints.length,
      })}
    </>
  );
}

export function HomeHeroLatestLessonCheckpointState({
  children,
  isEnabled,
  initialLatestLessonCheckpoint,
  isLiveProgressReady,
}: HomeHeroLatestLessonCheckpointStateProps): React.JSX.Element {
  if (!isEnabled) {
    return (
      <>
        {children({
          homeHeroRecentCheckpoint: null,
          homeHeroRecentCheckpointCount: 0,
        })}
      </>
    );
  }

  if (!isLiveProgressReady) {
    return (
      <>
        {children({
          homeHeroRecentCheckpoint: initialLatestLessonCheckpoint,
          homeHeroRecentCheckpointCount: initialLatestLessonCheckpoint ? 1 : 0,
        })}
      </>
    );
  }

  return <LiveHomeHeroLatestLessonCheckpointState>{children}</LiveHomeHeroLatestLessonCheckpointState>;
}

function LiveHomeDebugProofOperationState({
  children,
}: {
  children: (debugProofOperation: string | null) => React.ReactNode;
}): React.JSX.Element {
  const params = useLocalSearchParams<{
    debugProofOperation?: string | string[];
  }>();

  return <>{children(resolveKangurHomeDebugProofOperation(params.debugProofOperation))}</>;
}

export function HomeDebugProofOperationState({
  children,
}: {
  children: (debugProofOperation: string | null) => React.ReactNode;
}): React.JSX.Element {
  if (!__DEV__) {
    return <>{children(null)}</>;
  }

  return <LiveHomeDebugProofOperationState>{children}</LiveHomeDebugProofOperationState>;
}

const createHomeDebugProofViewModel = (input: {
  isEnabled: boolean;
  isLoading: boolean;
  locale: 'pl' | 'en' | 'de';
  operation: string | null;
  recentResults: KangurScore[];
  strongestOperation: KangurMobileOperationPerformance | null;
  weakestOperation: KangurMobileOperationPerformance | null;
}) =>
  input.operation
    ? buildKangurHomeDebugProofViewModel(input)
    : null;

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

export function LiveAuthenticatedHomeScoreState({
  areDeferredHomePanelsReady,
  areDeferredHomeScoreRefreshReady,
  children,
  debugProofOperation,
}: HomeScoreStateProps & {
  areDeferredHomeScoreRefreshReady: boolean;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const cachedRecentResults = useKangurMobileRecentResults({
    enabled: false,
  });
  const trainingFocus = useKangurMobileTrainingFocus({
    enabled: areDeferredHomeScoreRefreshReady,
    recentResultsLimit: 3,
  });
  const hasResolvedHomeScoreInsights =
    trainingFocus.isEnabled &&
    !trainingFocus.isLoading &&
    !trainingFocus.isRestoringAuth &&
    !trainingFocus.error;
  const recentResults = {
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
