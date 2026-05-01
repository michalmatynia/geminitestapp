import 'server-only';

import {
  runPlaywrightVerificationObservationLoopWithProfile,
  type PlaywrightVerificationCaptureParamsBase,
  type PlaywrightVerificationInjectionConfig,
  type PlaywrightVerificationReviewLoopProfile,
} from '@/features/playwright/server/ai-step-service';

import {
  buildProductScanVerificationDiagnosticsPayloadFromState,
  createProductScanVerificationBarrierReviewLoopProfile,
  createProductScanVerificationState,
  type ProductScanVerificationObservationBase,
  type ProductScanVerificationReview,
} from './product-scan-verification.core';
import {
  runProductScanVerificationBarrierReviewCaptureWithState,
} from './product-scan-verification.capture';
import {
  createProductScanVerificationBarrierAutoInjectionConfig,
} from './product-scan-verification.evaluation';
import type {
  ProductScanVerificationBarrierPageSession,
  ProductScanVerificationBarrierPageSessionContext,
  ProductScanVerificationBarrierRuntime,
  ProductScanVerificationBarrierRuntimeOptions,
} from './product-scan-verification.runtime-types';

const createInjectionConfig = (
  providerLabel: string | null | undefined,
  overrides: Partial<PlaywrightVerificationInjectionConfig<ProductScanVerificationReview>> | null | undefined
): PlaywrightVerificationInjectionConfig<ProductScanVerificationReview> => {
  const baseInjectionConfig = createProductScanVerificationBarrierAutoInjectionConfig({
    provider: providerLabel ?? undefined,
  });
  return overrides !== null && overrides !== undefined
    ? { ...baseInjectionConfig, ...overrides }
    : baseInjectionConfig;
};

const resolveCaptureCurrentUrl = (
  captureOptions: {
    params: PlaywrightVerificationCaptureParamsBase;
    resolveCurrentUrl?: (() => string | null) | null;
  }
): string | null => {
  if (
    'currentUrl' in captureOptions.params &&
    typeof captureOptions.params.currentUrl === 'string'
  ) {
    return captureOptions.params.currentUrl;
  }
  return captureOptions.resolveCurrentUrl?.() ?? null;
};

const rejectUninitializedObservationLoop = (): Promise<never> =>
  Promise.reject(new Error('Product scan verification runtime observation loop is not initialized.'));

const throwUninitializedPageSession = (): never => {
  throw new Error('Product scan verification runtime page session is not initialized.');
};

const createBaseRuntime = <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object,
>(
  options: ProductScanVerificationBarrierRuntimeOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >,
  profile: PlaywrightVerificationReviewLoopProfile<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >,
  injectOnEvaluation: PlaywrightVerificationInjectionConfig<ProductScanVerificationReview>
): ProductScanVerificationBarrierRuntime<TState, TBaseParams, TParams, TObservation, TExtra> => {
  const runtime: ProductScanVerificationBarrierRuntime<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  > = {
    profile,
    createState: () =>
      createProductScanVerificationState<ProductScanVerificationReview, TObservation>(),
    buildDiagnosticsPayload: (state) =>
      buildProductScanVerificationDiagnosticsPayloadFromState({
        reviewKey: options.reviewKey,
        observationsKey: options.observationsKey,
        state,
      }),
    captureWithState: (captureOptions) =>
      runProductScanVerificationBarrierReviewCaptureWithState({
        ...captureOptions,
        profile,
        injectOnEvaluation,
      }),
    captureWithStateFromPage: (captureOptions) =>
      runProductScanVerificationBarrierReviewCaptureWithState({
        ...captureOptions,
        currentUrl: resolveCaptureCurrentUrl(captureOptions),
        profile,
        injectOnEvaluation,
      }),
    observeLoopWithPage: rejectUninitializedObservationLoop,
    createPageSession: throwUninitializedPageSession,
  };
  return runtime;
};

const attachObservationLoop = <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object,
>(
  runtime: ProductScanVerificationBarrierRuntime<TState, TBaseParams, TParams, TObservation, TExtra>
): void => {
  const mutableRuntime = runtime;
  mutableRuntime.observeLoopWithPage = (loopOptions) =>
    runPlaywrightVerificationObservationLoopWithProfile({
      timeoutMs: loopOptions.timeoutMs,
      stableClearWindowMs: loopOptions.stableClearWindowMs,
      intervalMs: loopOptions.intervalMs,
      initialSnapshot: loopOptions.initialSnapshot,
      isPageClosed: loopOptions.isPageClosed,
      wait: loopOptions.wait,
      readSnapshot: loopOptions.readSnapshot,
      profile: runtime.profile,
      baseParams: loopOptions.baseParams,
      captureObservation: (params) =>
        runtime.captureWithStateFromPage({
          verificationState: loopOptions.verificationState,
          params,
          resolveCurrentUrl: loopOptions.resolveCurrentUrl,
          page: loopOptions.page,
          artifacts: loopOptions.artifacts,
          log: loopOptions.log,
          upsertStep: loopOptions.upsertStep,
        }),
    });
};

const createPageSession = <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object,
>(
  runtime: ProductScanVerificationBarrierRuntime<TState, TBaseParams, TParams, TObservation, TExtra>,
  sessionOptions: ProductScanVerificationBarrierPageSessionContext<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >
): ProductScanVerificationBarrierPageSession<TState, TBaseParams, TParams, TObservation, TExtra> => {
  const state = runtime.createState();
  const pageSession: ProductScanVerificationBarrierPageSession<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  > = {
    state,
    buildDiagnosticsPayload: () => runtime.buildDiagnosticsPayload(state),
    augmentPayload: (payload) => ({ ...runtime.buildDiagnosticsPayload(state), ...payload }),
    capture: ({ params }) =>
      runtime.captureWithStateFromPage({ ...sessionOptions, verificationState: state, params }),
    observeLoop: (loopOptions) =>
      runtime.observeLoopWithPage({ ...loopOptions, ...sessionOptions, verificationState: state }),
    bindBaseParams: (baseParams) => ({
      capture: (params) => {
        const mergedParams: TParams = { ...baseParams, ...params };
        return pageSession.capture({ params: mergedParams });
      },
      observeLoop: (loopOptions) => pageSession.observeLoop({ ...loopOptions, baseParams }),
    }),
  };
  return pageSession;
};

const attachPageSessionFactory = <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object,
>(
  runtime: ProductScanVerificationBarrierRuntime<TState, TBaseParams, TParams, TObservation, TExtra>
): void => {
  const mutableRuntime = runtime;
  mutableRuntime.createPageSession = (sessionOptions) =>
    createPageSession(runtime, sessionOptions);
};

export const createProductScanVerificationBarrierRuntime = <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TObservation extends ProductScanVerificationObservationBase,
  TExtra extends object = Record<never, never>,
>(
  options: ProductScanVerificationBarrierRuntimeOptions<
    TState,
    TBaseParams,
    TParams,
    TObservation,
    TExtra
  >
): ProductScanVerificationBarrierRuntime<TState, TBaseParams, TParams, TObservation, TExtra> => {
  const profile = createProductScanVerificationBarrierReviewLoopProfile(options.profile);
  const runtime = createBaseRuntime(
    options,
    profile,
    createInjectionConfig(options.injectorProviderLabel, options.injectionConfigOverrides)
  );
  attachObservationLoop(runtime);
  attachPageSessionFactory(runtime);
  return runtime;
};
