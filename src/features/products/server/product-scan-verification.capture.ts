import 'server-only';

import {
  runPlaywrightVerificationReviewCapture,
  type PlaywrightVerificationCaptureParamsBase,
  type PlaywrightVerificationObservationLike,
  type PlaywrightVerificationReviewLoopProfile,
  type RunPlaywrightVerificationReviewCaptureOptions,
} from '@/features/playwright/server/ai-step-service';
import type { PlaywrightCapturedPageObservation } from '@/features/playwright/server/ai-step-service/types';

import {
  commitProductScanVerificationObservation,
  getLastProductScanVerificationObservation,
  resolveProductScanVerificationBarrierEvaluationProfile,
  type ProductScanVerificationBarrierEvaluationProfileLike,
  type ProductScanVerificationObservationBase,
  type ProductScanVerificationReview,
  type ProductScanVerificationState,
} from './product-scan-verification.core';
import { evaluateProductScanVerificationBarrier } from './product-scan-verification.evaluation';

export type ProductScanVerificationBarrierEvaluationInput = {
  provider: string;
  stage: string;
  currentUrl: string | null;
  pageTitle: string | null;
  pageTextSnippet: string | null;
  screenshotBase64: string | null;
  screenshotArtifactName?: string | null;
  htmlArtifactName?: string | null;
  objective?: string | null;
};

type CapturedBarrierPage = Pick<
  PlaywrightCapturedPageObservation,
  | 'currentUrl'
  | 'pageTitle'
  | 'pageTextSnippet'
  | 'screenshotBase64'
  | 'screenshotArtifactName'
  | 'htmlArtifactName'
>;

export const createProductScanVerificationBarrierEvaluationInput = (options: {
  provider: string;
  stage: string;
  objective?: string | null;
  capture: CapturedBarrierPage;
}): ProductScanVerificationBarrierEvaluationInput => ({
  provider: options.provider,
  stage: options.stage,
  currentUrl: options.capture.currentUrl,
  pageTitle: options.capture.pageTitle,
  pageTextSnippet: options.capture.pageTextSnippet,
  screenshotBase64: options.capture.screenshotBase64,
  screenshotArtifactName: options.capture.screenshotArtifactName,
  htmlArtifactName: options.capture.htmlArtifactName,
  objective: options.objective,
});

export const createProductScanVerificationBarrierEvaluationInputFromProfile = <
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationObservationLike,
>(options: {
  profile: ProductScanVerificationBarrierEvaluationProfileLike<TParams, TReview>;
  params: TParams;
  capture: CapturedBarrierPage;
}): ProductScanVerificationBarrierEvaluationInput => {
  const profile = resolveProductScanVerificationBarrierEvaluationProfile(options.profile);
  return createProductScanVerificationBarrierEvaluationInput({
    provider: profile.evaluation.provider,
    stage: profile.evaluation.resolveStage(options.params),
    objective:
      typeof profile.evaluation.objective === 'function'
        ? profile.evaluation.objective(options.params) ?? null
        : profile.evaluation.objective ?? null,
    capture: options.capture,
  });
};

export const evaluateProductScanVerificationBarrierFromProfile = async <
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationObservationLike,
>(options: {
  profile: ProductScanVerificationBarrierEvaluationProfileLike<TParams, TReview>;
  params: TParams;
  capture: CapturedBarrierPage;
}): Promise<ProductScanVerificationReview> =>
  evaluateProductScanVerificationBarrier(
    createProductScanVerificationBarrierEvaluationInputFromProfile(options)
  );

export type RunProductScanVerificationBarrierReviewCaptureOptions<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = Omit<
  RunPlaywrightVerificationReviewCaptureOptions<
    TParams,
    ProductScanVerificationReview,
    TObservation,
    TExtra
  >,
  'profile' | 'evaluate'
> & {
  profile: PlaywrightVerificationReviewLoopProfile<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >;
};

export type RunProductScanVerificationBarrierReviewCaptureWithStateOptions<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = Omit<
  RunProductScanVerificationBarrierReviewCaptureOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >,
  'previousObservation' | 'commitObservation'
> & {
  verificationState: ProductScanVerificationState<
    ProductScanVerificationReview,
    TObservation
  >;
};

export const runProductScanVerificationBarrierReviewCapture = async <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
>(
  options: RunProductScanVerificationBarrierReviewCaptureOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >
): Promise<TObservation | null> => {
  const { profile, ...rest } = options;

  return runPlaywrightVerificationReviewCapture<
    TParams,
    ProductScanVerificationReview,
    TObservation,
    TExtra
  >({
    ...rest,
    profile: profile.review,
    evaluate: (capture, params) =>
      evaluateProductScanVerificationBarrierFromProfile({
        profile,
        params,
        capture,
      }),
  });
};

export const runProductScanVerificationBarrierReviewCaptureWithState = async <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
>(
  options: RunProductScanVerificationBarrierReviewCaptureWithStateOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >
): Promise<TObservation | null> => {
  const { verificationState, ...rest } = options;
  return runProductScanVerificationBarrierReviewCapture({
    ...rest,
    previousObservation: getLastProductScanVerificationObservation(verificationState),
    commitObservation: ({ review, observation, injection }) =>
      commitProductScanVerificationObservation(verificationState, {
        review,
        observation,
        injection,
      }),
  });
};
