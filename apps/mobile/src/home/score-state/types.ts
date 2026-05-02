import { type Href } from 'expo-router';
import type { KangurScore } from '@kangur/contracts/kangur';
import { type buildKangurHomeDebugProofViewModel } from '../homeDebugProof';
import { type KangurMobileOperationPerformance } from '../../scores/mobileScoreSummary';

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
  homeDebugProof: ReturnType<typeof buildKangurHomeDebugProofViewModel> | null;
  homeHeroFocusHref: Href;
  homeHeroFocusLabel: string;
  homeHeroRecentResult: KangurScore | null;
  recentResults: HomeRecentResultsViewModel;
  trainingFocus: HomeTrainingFocusViewModel;
};

export type HomeScoreStateProps = {
  areDeferredHomePanelsReady: boolean;
  children: (viewModel: HomeScoreViewModel) => React.ReactNode;
  debugProofOperation: string | null;
};

export const noopRefreshHomeScoreViewModel = async (): Promise<void> => {};
