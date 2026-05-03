import 'server-only';

import type {
  PlaywrightObservationLoopResult,
  PlaywrightVerificationCaptureParamsBase,
  PlaywrightVerificationInjectionConfig,
  PlaywrightVerificationObservationLoopWithProfileOptions,
  PlaywrightVerificationReviewLoopProfile,
  PlaywrightVerificationReviewLoopProfileOptions,
} from '@/features/playwright/server/ai-step-service';

import type {
  ProductScanVerificationObservationBase,
  ProductScanVerificationReview,
  ProductScanVerificationState,
} from './product-scan-verification.core';
import type {
  RunProductScanVerificationBarrierReviewCaptureWithStateOptions,
} from './product-scan-verification.capture';

export type ProductScanVerificationBarrierRuntime<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = {
  profile: PlaywrightVerificationReviewLoopProfile<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >;
  createState: () => ProductScanVerificationState<
    ProductScanVerificationReview,
    TObservation
  >;
  buildDiagnosticsPayload: (
    state: ProductScanVerificationState<ProductScanVerificationReview, TObservation>
  ) => Record<string, unknown>;
  captureWithState: (
    options: ProductScanVerificationBarrierCaptureWithStateOptions<
      TState,
      TBaseParams,
      TParams,
      TObservation,
      TExtra
    >
  ) => Promise<TObservation | null>;
  captureWithStateFromPage: (
    options: ProductScanVerificationBarrierCaptureWithStateFromPageOptions<
      TState,
      TBaseParams,
      TParams,
      TObservation,
      TExtra
    >
  ) => Promise<TObservation | null>;
  observeLoopWithPage: (
    options: ProductScanVerificationBarrierObserveLoopWithPageOptions<
      TState,
      TBaseParams,
      TParams,
      TObservation,
      TExtra
    >
  ) => Promise<PlaywrightObservationLoopResult<TState, TObservation>>;
  createPageSession: (
    options: ProductScanVerificationBarrierPageSessionContext<
      TState,
      TBaseParams,
      TParams,
      TObservation,
      TExtra
    >
  ) => ProductScanVerificationBarrierPageSession<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >;
};

export type ProductScanVerificationBarrierCaptureWithStateOptions<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = Omit<
  RunProductScanVerificationBarrierReviewCaptureWithStateOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >,
  'profile' | 'injectOnEvaluation'
>;

export type ProductScanVerificationBarrierCaptureWithStateFromPageOptions<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = Omit<
  RunProductScanVerificationBarrierReviewCaptureWithStateOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >,
  'profile' | 'injectOnEvaluation' | 'currentUrl'
> & {
  resolveCurrentUrl?: (() => string | null) | null;
};

export type ProductScanVerificationBarrierObserveLoopWithPageOptions<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = Omit<
  PlaywrightVerificationObservationLoopWithProfileOptions<
    TState,
    TObservation,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >,
  'profile' | 'captureObservation'
> &
  Omit<
    RunProductScanVerificationBarrierReviewCaptureWithStateOptions<
      TState,
      TBaseParams,
      TParams,
      TObservation,
      TExtra
    >,
    'profile' | 'injectOnEvaluation' | 'params' | 'currentUrl'
  > & {
    verificationState: ProductScanVerificationState<
      ProductScanVerificationReview,
      TObservation
    >;
    resolveCurrentUrl?: (() => string | null) | null;
  };

export type ProductScanVerificationBarrierPageSessionContext<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = Omit<
  ProductScanVerificationBarrierCaptureWithStateFromPageOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >,
  'verificationState' | 'params'
>;

export type ProductScanVerificationBarrierPageSession<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = {
  state: ProductScanVerificationState<ProductScanVerificationReview, TObservation>;
  buildDiagnosticsPayload: () => Record<string, unknown>;
  augmentPayload: (payload: Record<string, unknown>) => Record<string, unknown>;
  capture: (options: { params: TParams }) => Promise<TObservation | null>;
  observeLoop: (
    options: Omit<
      ProductScanVerificationBarrierObserveLoopWithPageOptions<
        TState,
        TBaseParams,
        TParams,
        TObservation,
        TExtra
      >,
      'verificationState' | 'resolveCurrentUrl' | 'page' | 'artifacts' | 'log' | 'upsertStep'
    >
  ) => Promise<PlaywrightObservationLoopResult<TState, TObservation>>;
  bindBaseParams: (
    baseParams: TBaseParams
  ) => ProductScanVerificationBarrierBoundPageSession<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >;
};

export type ProductScanVerificationBarrierBoundPageSession<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = {
  capture: (
    params: Omit<TParams, keyof TBaseParams>
  ) => Promise<TObservation | null>;
  observeLoop: (
    options: Omit<
      ProductScanVerificationBarrierObserveLoopWithPageOptions<
        TState,
        TBaseParams,
        TParams,
        TObservation,
        TExtra
      >,
      | 'verificationState'
      | 'resolveCurrentUrl'
      | 'page'
      | 'artifacts'
      | 'log'
      | 'upsertStep'
      | 'baseParams'
    >
  ) => Promise<PlaywrightObservationLoopResult<TState, TObservation>>;
};

export type ProductScanVerificationBarrierRuntimeOptions<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
> = {
  reviewKey: string;
  observationsKey: string;
  injectorProviderLabel?: string | null;
  injectionConfigOverrides?: Partial<
    PlaywrightVerificationInjectionConfig<ProductScanVerificationReview>
  > | null;
  profile: PlaywrightVerificationReviewLoopProfileOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >;
};
