export const resolvePlaywrightVerificationReviewStepOutcome = (
  review: Pick<PlaywrightVerificationReviewLike, 'status' | 'error'>,
  messages: PlaywrightVerificationReviewStepMessages
): PlaywrightVerificationReviewStepOutcome => {
  if (review.status === 'failed') {
    return {
      status: 'failed',
      resultCode: 'capture_failed',
      message: messages.failed,
      warning: null,
    };
  }

  return {
    status: 'completed',
    resultCode: review.status === 'analyzed' ? 'manual_review_ready' : 'capture_only',
    message: review.status === 'analyzed' ? messages.analyzed : messages.captureOnly,
    warning: review.status === 'capture_only' ? normalizeOptionalText(review.error) : null,
  };
};

export const createPlaywrightVerificationReviewStepMessages = (
  subject: string
): PlaywrightVerificationReviewStepMessages => ({
  analyzed: `Captured and classified the ${subject} for manual review.`,
  captureOnly: `Captured the ${subject}, but AI review was unavailable.`,
  failed: `Could not capture the ${subject} for AI review.`,
});

export const createPlaywrightVerificationReviewArtifactConfig = (options: {
  historyArtifactKey: string;
  artifactKeyPrefix: string;
  analysisArtifactSuffix?: string;
}): PlaywrightVerificationReviewArtifactConfig => ({
  historyArtifactKey: options.historyArtifactKey,
  artifactKeyPrefix: options.artifactKeyPrefix,
  analysisArtifactSuffix: options.analysisArtifactSuffix ?? '-analysis',
});

export const createPlaywrightVerificationReviewStepConfig = (options: {
  key: string;
  subject: string;
  runningMessage: string;
  group?: string;
  label?: string;
}): PlaywrightVerificationReviewStepConfig => ({
  key: options.key,
  runningMessage: options.runningMessage,
  messages: createPlaywrightVerificationReviewStepMessages(options.subject),
  ...(options.group ? { group: options.group } : {}),
  ...(options.label ? { label: options.label } : {}),
});

export const createPlaywrightVerificationReviewRuntimeConfig = (options: {
  key: string;
  subject: string;
  runningMessage: string;
  historyArtifactKey: string;
  artifactKeyPrefix: string;
  analysisArtifactSuffix?: string;
  group?: string;
  label?: string;
}): PlaywrightVerificationReviewRuntimeConfig => ({
  step: createPlaywrightVerificationReviewStepConfig({
    key: options.key,
    subject: options.subject,
    runningMessage: options.runningMessage,
    ...(options.group ? { group: options.group } : {}),
    ...(options.label ? { label: options.label } : {}),
  }),
  artifacts: createPlaywrightVerificationReviewArtifactConfig({
    historyArtifactKey: options.historyArtifactKey,
    artifactKeyPrefix: options.artifactKeyPrefix,
    analysisArtifactSuffix: options.analysisArtifactSuffix,
  }),
});

export const createPlaywrightVerificationReviewProfile = <
  TParams,
  TReview extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
>(
  options: PlaywrightVerificationReviewProfileOptions<TParams, TReview, TExtra>
): PlaywrightVerificationReviewProfile<TParams, TReview, TExtra> => {
  const runtime = createPlaywrightVerificationReviewRuntimeConfig({
    key: options.key,
    subject: options.subject,
    runningMessage: options.runningMessage,
    historyArtifactKey: options.historyArtifactKey,
    artifactKeyPrefix: options.artifactKeyPrefix,
    analysisArtifactSuffix: options.analysisArtifactSuffix,
    group: options.group,
    label: options.label,
  });

  return {
    runtime,
    capture: {
      runtime,
      buildArtifactSegments: options.buildArtifactSegments,
      buildFingerprintPartMap: options.buildFingerprintPartMap,
    },
    evaluation: {
      provider: options.evaluationProvider,
      resolveStage: options.resolveEvaluationStage,
      objective: options.evaluationObjective ?? null,
    },
    observation: {
      buildExtra: options.buildObservationExtra ?? (() => ({} as TExtra)),
    },
    detailDescriptors: options.detailDescriptors,
    analysisFailureLogKey: normalizeOptionalText(options.analysisFailureLogKey),
    screenshotFailureLogKey: normalizeOptionalText(options.screenshotFailureLogKey),
  };
};

export type PlaywrightVerificationReviewLoopProfile<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
> = {
  review: PlaywrightVerificationReviewProfile<TParams, TReview, TExtra>;
  adapter: PlaywrightVerificationObservationLoopAdapter<TState, TBaseParams, TParams>;
};

export type PlaywrightVerificationReviewLoopProfileOptions<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
> = PlaywrightVerificationReviewProfileOptions<TParams, TReview, TExtra> & {
  buildLoopCaptureParams: (
    input: PlaywrightObservationLoopObserveInput<TState>,
    baseParams: TBaseParams
  ) => TParams;
};

export const createPlaywrightVerificationReviewLoopProfile = <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
>(
  options: PlaywrightVerificationReviewLoopProfileOptions<
    TState,
    TBaseParams,
    TParams,
    TReview,
    TExtra
  >
): PlaywrightVerificationReviewLoopProfile<
  TState,
  TBaseParams,
  TParams,
  TReview,
  TExtra
> => ({
  review: createPlaywrightVerificationReviewProfile(options),
  adapter: createPlaywrightVerificationObservationLoopAdapter({
    buildCaptureParams: options.buildLoopCaptureParams,
  }),
});

export const resolvePlaywrightVerificationReviewArtifactKeys = (
  artifactKey: string,
  config: PlaywrightVerificationReviewArtifactConfig
): { analysisArtifactKey: string; historyArtifactKey: string } => ({
  analysisArtifactKey: `${artifactKey}${config.analysisArtifactSuffix ?? '-analysis'}`,
  historyArtifactKey: config.historyArtifactKey,
});

export const buildPlaywrightVerificationReviewArtifactKey = (
  config: Pick<PlaywrightVerificationReviewArtifactConfig, 'artifactKeyPrefix'>,
  segments: readonly (string | null | undefined)[]
): string =>
  [config.artifactKeyPrefix, ...segments]
    .map((segment) => normalizeOptionalText(segment))
    .filter((segment): segment is string => segment !== null)
    .join('-');

export const resolvePlaywrightVerificationReviewCaptureContext = <TParams>(
  config: PlaywrightVerificationReviewCaptureConfig<TParams>,
  params: TParams
): {
  artifactKey: string;
  extraFingerprintParts: string[];
} => ({
  artifactKey: buildPlaywrightVerificationReviewArtifactKey(
    config.runtime.artifacts,
    config.buildArtifactSegments(params)
  ),
  extraFingerprintParts: buildPlaywrightVerificationReviewFingerprintParts(
    config.buildFingerprintPartMap(params)
  ),
});

export const createPlaywrightVerificationObservation = <
  TReview extends PlaywrightVerificationReviewLike,
  TLoopDecision extends string,
  TExtra extends object = Record<never, never>,
>(
  options: {
    review: TReview;
    capture: Pick<PlaywrightCapturedPageObservation, 'observedAt' | 'fingerprint'>;
    iteration: number;
    loopDecision: TLoopDecision;
    stableForMs: number | null;
    extra?: TExtra;
  }
): TReview &
  TExtra & {
    iteration: number;
    observedAt: string;
    loopDecision: TLoopDecision;
    stableForMs: number | null;
    fingerprint: string;
  } => ({
  ...options.review,
  iteration: options.iteration,
  observedAt: options.capture.observedAt,
  loopDecision: options.loopDecision,
  stableForMs: options.stableForMs,
  fingerprint: options.capture.fingerprint,
  ...((options.extra ?? {}) as TExtra),
});

export const createPlaywrightVerificationObservationFromProfile = <
  TParams,
  TProfileReview extends PlaywrightVerificationObservationLike,
  TBaseReview extends PlaywrightVerificationReviewLike,
  TLoopDecision extends string,
  TExtra extends object = Record<never, never>,
>(options: {
  profile: Pick<PlaywrightVerificationReviewProfile<TParams, TProfileReview, TExtra>, 'observation'>;
  params: TParams;
  review: TBaseReview;
  capture: Pick<PlaywrightCapturedPageObservation, 'observedAt' | 'fingerprint'>;
  iteration: number;
  loopDecision: TLoopDecision;
  stableForMs: number | null;
}): TBaseReview &
  TExtra & {
    iteration: number;
    observedAt: string;
    loopDecision: TLoopDecision;
    stableForMs: number | null;
    fingerprint: string;
  } =>
  createPlaywrightVerificationObservation({
    review: options.review,
    capture: options.capture,
    iteration: options.iteration,
    loopDecision: options.loopDecision,
    stableForMs: options.stableForMs,
    extra: options.profile.observation.buildExtra(options.params),
  });
