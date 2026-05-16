import 'server-only';

import {
  createPlaywrightVerificationReviewLoopProfile,
  type PlaywrightVerificationCaptureParamsBase,
  type PlaywrightVerificationObservationLike,
  type PlaywrightVerificationReviewProfile,
  type PlaywrightInjectionAttemptResult,
  type PlaywrightVerificationReviewLoopProfile,
  type PlaywrightVerificationReviewLoopProfileOptions,
} from '@/features/playwright/server/ai-step-service';

export type ProductScanVerificationReview = {
  status: 'analyzed' | 'capture_only' | 'failed';
  provider: string;
  stage: string;
  currentUrl: string | null;
  pageTitle: string | null;
  pageTextSnippet: string | null;
  challengeType: string | null;
  visibleQuestion: string | null;
  visibleInstructions: string[];
  uiElements: string[];
  pageSummary: string | null;
  manualActionRequired: boolean | null;
  confidence: number | null;
  screenshotArtifactName: string | null;
  htmlArtifactName: string | null;
  modelId: string | null;
  brainApplied: Record<string, unknown> | null;
  error: string | null;
  evaluatedAt: string | null;
};

export type ProductScanVerificationObservationBase<
  TLoopDecision extends string = string,
> = ProductScanVerificationReview & {
  iteration: number;
  observedAt: string | null;
  loopDecision: TLoopDecision;
  stableForMs: number | null;
  fingerprint: string;
};

export type ProductScanVerificationReviewCloneable = {
  visibleInstructions: string[];
  uiElements: string[];
  brainApplied: Record<string, unknown> | null;
};

export type ProductScanVerificationState<
  TReview extends ProductScanVerificationReviewCloneable,
  TObservation extends ProductScanVerificationReviewCloneable,
> = {
  review: TReview | null;
  observations: TObservation[];
  injectionAttempts: PlaywrightInjectionAttemptResult[];
};

export type ProductScanVerificationBarrierEvaluationProfileLike<
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationObservationLike,
> =
  | Pick<PlaywrightVerificationReviewProfile<TParams, TReview>, 'evaluation'>
  | Pick<
      PlaywrightVerificationReviewLoopProfile<
        unknown,
        unknown,
        TParams & PlaywrightVerificationCaptureParamsBase,
        TReview
      >,
      'review'
    >;

export const resolveProductScanVerificationBarrierEvaluationProfile = <
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationObservationLike,
>(
  profile: ProductScanVerificationBarrierEvaluationProfileLike<TParams, TReview>
): Pick<PlaywrightVerificationReviewProfile<TParams, TReview>, 'evaluation'> =>
  'review' in profile ? profile.review : profile;

export const cloneProductScanVerificationReview = <
  TReview extends ProductScanVerificationReviewCloneable,
>(
  review: TReview
): TReview => ({
  ...review,
  visibleInstructions: [...review.visibleInstructions],
  uiElements: [...review.uiElements],
  brainApplied: review.brainApplied !== null ? { ...review.brainApplied } : null,
});

export const cloneProductScanVerificationObservations = <
  TReview extends ProductScanVerificationReviewCloneable,
>(
  observations: readonly TReview[]
): TReview[] => observations.map((observation) => cloneProductScanVerificationReview(observation));

export const createProductScanVerificationState = <
  TReview extends ProductScanVerificationReviewCloneable,
  TObservation extends ProductScanVerificationReviewCloneable,
>(): ProductScanVerificationState<TReview, TObservation> => ({
  review: null,
  observations: [],
  injectionAttempts: [],
});

export const cloneProductScanVerificationStateReview = <
  TReview extends ProductScanVerificationReviewCloneable,
  TObservation extends ProductScanVerificationReviewCloneable,
>(
  state: ProductScanVerificationState<TReview, TObservation>
): TReview | null =>
  state.review !== null ? cloneProductScanVerificationReview(state.review) : null;

export const cloneProductScanVerificationStateObservations = <
  TReview extends ProductScanVerificationReviewCloneable,
  TObservation extends ProductScanVerificationReviewCloneable,
>(
  state: ProductScanVerificationState<TReview, TObservation>
): TObservation[] => cloneProductScanVerificationObservations(state.observations);

export const getLastProductScanVerificationObservation = <
  TReview extends ProductScanVerificationReviewCloneable,
  TObservation extends ProductScanVerificationReviewCloneable,
>(
  state: ProductScanVerificationState<TReview, TObservation>
): TObservation | null => state.observations[state.observations.length - 1] ?? null;

export const commitProductScanVerificationObservation = <
  TReview extends ProductScanVerificationReviewCloneable,
  TObservation extends ProductScanVerificationReviewCloneable,
>(
  state: ProductScanVerificationState<TReview, TObservation>,
  input: {
    review: TReview;
    observation: TObservation;
    injection?: PlaywrightInjectionAttemptResult | null;
  }
): readonly TObservation[] => {
  const mutableState = state;
  mutableState.review = input.review;
  mutableState.observations.push(input.observation);
  if (input.injection?.attempted === true) mutableState.injectionAttempts.push(input.injection);
  return mutableState.observations;
};

export const buildProductScanVerificationDiagnosticsPayload = (options: {
  reviewKey: string;
  observationsKey: string;
  review: ProductScanVerificationReviewCloneable | null;
  observations: readonly ProductScanVerificationReviewCloneable[];
  injectionAttempts?: readonly PlaywrightInjectionAttemptResult[];
}): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (options.review !== null) {
    payload[options.reviewKey] = cloneProductScanVerificationReview(options.review);
  }
  if (options.observations.length > 0) {
    payload[options.observationsKey] = cloneProductScanVerificationObservations(options.observations);
  }
  const attempts = options.injectionAttempts;
  if (attempts !== undefined && attempts.length > 0) {
    payload['injectionAttempts'] = attempts.length;
    payload['injectionSuccesses'] = attempts.filter((attempt) => attempt.done).length;
  }
  return payload;
};

export const buildProductScanVerificationDiagnosticsPayloadFromState = <
  TReview extends ProductScanVerificationReviewCloneable,
  TObservation extends ProductScanVerificationReviewCloneable,
>(options: {
  reviewKey: string;
  observationsKey: string;
  state: ProductScanVerificationState<TReview, TObservation>;
}): Record<string, unknown> =>
  buildProductScanVerificationDiagnosticsPayload({
    reviewKey: options.reviewKey,
    observationsKey: options.observationsKey,
    review: options.state.review,
    observations: options.state.observations,
    injectionAttempts: options.state.injectionAttempts,
  });

export const createProductScanVerificationBarrierReviewLoopProfile = <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
>(
  options: PlaywrightVerificationReviewLoopProfileOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >
): PlaywrightVerificationReviewLoopProfile<
  TState,
  TBaseParams,
  TParams,
  TObservation,
  TExtra
> => createPlaywrightVerificationReviewLoopProfile(options);
