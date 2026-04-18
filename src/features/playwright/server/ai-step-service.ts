import 'server-only';

import type { Page } from 'playwright';
import type { z } from 'zod';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/segments/api';
import {
  isBrainModelVisionCapable,
  runBrainChatCompletion,
} from '@/shared/lib/ai-brain/server-runtime-client';

const EVALUATOR_DEFAULT_SYSTEM_PROMPT =
  'Evaluate the current page state and describe what you observe.';

const INJECTOR_DEFAULT_SYSTEM_PROMPT = `You are a Playwright automation expert and code generator.

You will receive a goal, context about the current page state, and optional prior evaluation results. Your job is to generate a focused Playwright TypeScript code snippet that progresses toward the goal.

Rules:
1. Respond ONLY with a valid JSON object — no markdown, no code fences, no extra text.
2. JSON shape: { "code": string, "done": boolean, "reasoning": string }
3. "code" must be a self-contained async Playwright snippet. Available variable: page (Playwright Page).
4. "done" must be true if the goal is achieved or can be achieved by executing this code, false if more iterations will be needed.
5. "reasoning" must briefly explain what the code does and what remains if done=false.
6. Do not use require() or import statements. Do not wrap in async function declarations.
7. Keep code minimal and targeted. One clear action per iteration.
8. Read runtime['aiEvaluatorOutput'] to access the last AI Evaluator analysis.
9. When a screenshot is provided, use it to understand the current visual state of the page before writing code.`;

export type PlaywrightStepEvaluateOptions = {
  inputSource: 'screenshot' | 'html' | 'text_content' | 'selector_text';
  data: string;
  systemPrompt?: string | null | undefined;
};

export type PlaywrightStepEvaluateResult = {
  output: string;
  modelId: string;
};

export type PlaywrightStructuredScreenshotEvaluationOptions<TParsed> = {
  screenshotBase64: string | null;
  systemPrompt: string;
  promptPayload?: unknown;
  responseSchema: z.ZodType<TParsed>;
};

export type PlaywrightStructuredScreenshotEvaluationResult<TParsed> = {
  parsed: TParsed | null;
  rawOutput: string | null;
  modelId: string | null;
  error: string | null;
};

export type PlaywrightObservationArtifacts = {
  html?: ((key: string) => Promise<unknown>) | null | undefined;
  file?: ((
    key: string,
    data: Buffer,
    options: { extension: string; mimeType: string; kind: string }
  ) => Promise<string | null | undefined>) | null | undefined;
};

export type PlaywrightCapturedPageObservation = {
  currentUrl: string | null;
  pageTitle: string | null;
  pageTextSnippet: string | null;
  screenshotBase64: string | null;
  screenshotArtifactName: string | null;
  htmlArtifactName: string | null;
  fingerprint: string;
  observedAt: string;
};

export type PlaywrightVerificationInjectionConfig<TReview> = {
  /** Return true to trigger the injector after this evaluation result */
  shouldInject: (review: TReview) => boolean;
  /** Natural-language goal for the AI code injector, or a function deriving it from the review */
  goal: string | ((review: TReview) => string);
  /** Optional system prompt override for the injector */
  systemPrompt?: string | null | undefined;
  /** Maximum injector iterations per observation (default: 3) */
  maxIterations?: number | null | undefined;
  /** Serialize the evaluation result into a text context string for the injector (default: JSON) */
  buildEvaluatorContext?: ((review: TReview) => string) | null | undefined;
  /**
   * When true, re-captures the page state and re-runs the evaluate function after injection
   * completes. The returned observation, review, and capture reflect the post-injection state.
   */
  reEvaluateAfterInjection?: boolean | null | undefined;
};

export type PlaywrightInjectionAttemptResult = {
  attempted: boolean;
  iterationsRun: number;
  done: boolean;
  lastReasoning: string | null;
  modelId: string | null;
  /** Page URL after the injection loop completed */
  finalUrl: string | null;
};

export type CaptureAndEvaluatePlaywrightObservationOptions<TReview, TObservation> = {
  page: Page;
  artifacts?: PlaywrightObservationArtifacts | null | undefined;
  artifactKey: string;
  currentUrl?: string | null | undefined;
  previousObservation?: TObservation | null | undefined;
  previousFingerprint?: string | null | undefined;
  extraFingerprintParts?: readonly unknown[] | null | undefined;
  textSelector?: string | null | undefined;
  maxTextLength?: number | null | undefined;
  screenshotKind?: string | null | undefined;
  log?: ((message: string, context?: unknown) => void) | null | undefined;
  screenshotFailureLogKey?: string | null | undefined;
  evaluate: (capture: PlaywrightCapturedPageObservation) => Promise<TReview>;
  buildObservation: (input: {
    capture: PlaywrightCapturedPageObservation;
    review: TReview;
  }) => TObservation;
  /** When set, runs the AI code injector after each evaluation that passes `shouldInject` */
  injectOnEvaluation?: PlaywrightVerificationInjectionConfig<TReview> | null | undefined;
};

export type CaptureAndEvaluatePlaywrightObservationResult<TReview, TObservation> = {
  observation: TObservation;
  review: TReview | null;
  capture: PlaywrightCapturedPageObservation;
  deduped: boolean;
  /** Present when the injector ran after this evaluation; null if no injection was attempted */
  injection: PlaywrightInjectionAttemptResult | null;
  /**
   * True when reEvaluateAfterInjection was set and the observation/review/capture reflect a
   * fresh capture taken after injection completed rather than the pre-injection state.
   */
  injectionReEvaluated: boolean;
};

export type PlaywrightVerificationReviewLike = {
  status: string;
  challengeType?: string | null | undefined;
  visibleQuestion?: string | null | undefined;
  manualActionRequired?: boolean | null | undefined;
  modelId?: string | null | undefined;
  screenshotArtifactName?: string | null | undefined;
  htmlArtifactName?: string | null | undefined;
  error?: string | null | undefined;
};

export type PlaywrightVerificationObservationLike = PlaywrightVerificationReviewLike & {
  iteration: number;
  observedAt?: string | null | undefined;
  loopDecision: string;
  stableForMs?: number | null | undefined;
  fingerprint: string;
};

export type PlaywrightVerificationReviewStepOutcome = {
  status: 'failed' | 'completed';
  resultCode: string;
  message: string;
  warning: string | null;
};

export type PlaywrightVerificationReviewStepMessages = {
  analyzed: string;
  captureOnly: string;
  failed: string;
};

export type PlaywrightVerificationReviewArtifactConfig = {
  historyArtifactKey: string;
  artifactKeyPrefix: string;
  analysisArtifactSuffix?: string;
};

export type PlaywrightVerificationReviewStepConfig = {
  key: string;
  runningMessage: string;
  messages: PlaywrightVerificationReviewStepMessages;
  group?: string;
  label?: string;
};

export type PlaywrightVerificationReviewRuntimeConfig = {
  step: PlaywrightVerificationReviewStepConfig;
  artifacts: PlaywrightVerificationReviewArtifactConfig;
};

export type PlaywrightVerificationReviewCaptureConfig<TParams> = {
  runtime: PlaywrightVerificationReviewRuntimeConfig;
  buildArtifactSegments: (
    params: TParams
  ) => readonly (string | null | undefined)[];
  buildFingerprintPartMap: (params: TParams) => Record<string, unknown>;
};

export type PlaywrightVerificationReviewEvaluationConfig<TParams> = {
  provider: string;
  resolveStage: (params: TParams) => string;
  objective?: string | ((params: TParams) => string | null | undefined) | null;
};

export type PlaywrightVerificationReviewObservationConfig<
  TParams,
  TExtra extends object,
> = {
  buildExtra: (params: TParams) => TExtra;
};

export type PlaywrightVerificationCaptureParamsBase<
  TLoopDecision extends string = string,
> = {
  candidateId: string;
  candidateRank: number;
  iteration: number;
  loopDecision: TLoopDecision;
  stableForMs: number | null;
};

export type PlaywrightVerificationReviewProfile<
  TParams,
  TReview extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
> = {
  runtime: PlaywrightVerificationReviewRuntimeConfig;
  capture: PlaywrightVerificationReviewCaptureConfig<TParams>;
  evaluation: PlaywrightVerificationReviewEvaluationConfig<TParams>;
  observation: PlaywrightVerificationReviewObservationConfig<TParams, TExtra>;
  detailDescriptors: readonly PlaywrightVerificationReviewDetailDescriptor<TReview>[];
  analysisFailureLogKey: string | null;
  screenshotFailureLogKey: string | null;
};

export type PlaywrightVerificationReviewProfileOptions<
  TParams,
  TReview extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
> = {
  key: string;
  subject: string;
  runningMessage: string;
  historyArtifactKey: string;
  artifactKeyPrefix: string;
  analysisArtifactSuffix?: string;
  group?: string;
  label?: string;
  analysisFailureLogKey?: string | null;
  screenshotFailureLogKey?: string | null;
  evaluationProvider: string;
  resolveEvaluationStage: (params: TParams) => string;
  evaluationObjective?: string | ((params: TParams) => string | null | undefined) | null;
  buildObservationExtra?: (params: TParams) => TExtra;
  buildArtifactSegments: (
    params: TParams
  ) => readonly (string | null | undefined)[];
  buildFingerprintPartMap: (params: TParams) => Record<string, unknown>;
  detailDescriptors: readonly PlaywrightVerificationReviewDetailDescriptor<TReview>[];
};

const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toArtifactName = (value: unknown): string | null =>
  normalizeOptionalText(typeof value === 'string' ? value.split('/').pop() : null);

const safePageUrl = (page: Pick<Page, 'url'>): string | null => {
  try {
    return page.url();
  } catch {
    return null;
  }
};

const serializePlaywrightObservationFingerprintPart = (part: unknown): string => {
  if (part === null || part === undefined) {
    return '';
  }
  if (typeof part === 'string') {
    return part;
  }
  if (typeof part === 'number' || typeof part === 'boolean' || typeof part === 'bigint') {
    return String(part);
  }
  try {
    return JSON.stringify(part);
  } catch {
    return String(part);
  }
};

export const buildPlaywrightObservationFingerprint = (
  parts: readonly unknown[]
): string =>
  parts.map((part) => serializePlaywrightObservationFingerprintPart(part)).join('::');

export const buildPlaywrightVerificationReviewFingerprintParts = (
  parts: Record<string, unknown>
): string[] =>
  Object.entries(parts).map(
    ([key, value]) => `${key}=${serializePlaywrightObservationFingerprintPart(value)}`
  );

export const slugifyPlaywrightVerificationReviewSegment = (
  value: string | null | undefined,
  fallback?: string
): string => {
  const normalized = normalizeOptionalText(value)
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized && normalized.length > 0) {
    return normalized;
  }

  return normalizeOptionalText(fallback) ?? 'unknown';
};

const executeInjectedPlaywrightCode = async (page: Page, code: string): Promise<void> => {
  if (!code.trim()) return;
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...a: unknown[]) => Promise<unknown>;
  await new AsyncFunction('page', code)(page);
};

async function runPlaywrightVerificationInjectionLoop<TReview>(
  page: Page,
  config: PlaywrightVerificationInjectionConfig<TReview>,
  review: TReview,
  currentUrl: string
): Promise<PlaywrightInjectionAttemptResult> {
  const maxIterations =
    typeof config.maxIterations === 'number' &&
    Number.isFinite(config.maxIterations) &&
    config.maxIterations > 0
      ? Math.trunc(config.maxIterations)
      : 3;
  const goal = typeof config.goal === 'function' ? config.goal(review) : config.goal;
  const evaluatorContext =
    typeof config.buildEvaluatorContext === 'function'
      ? config.buildEvaluatorContext(review)
      : (() => {
          try {
            return JSON.stringify(review);
          } catch {
            return String(review);
          }
        })();

  let iterationsRun = 0;
  let done = false;
  let lastReasoning: string | null = null;
  let modelId: string | null = null;
  let priorInjectorReasoning: string | null = null;
  let activeUrl = currentUrl;

  while (iterationsRun < maxIterations && !done) {
    iterationsRun++;

    const [dom, screenshotBuffer] = await Promise.all([
      page.content().catch(() => null),
      page.screenshot({ type: 'png' }).catch(() => null),
    ]);
    const screenshotBase64 = screenshotBuffer ? screenshotBuffer.toString('base64') : null;

    const result = await injectCodeWithAI({
      goal,
      systemPrompt: config.systemPrompt ?? null,
      context: {
        iteration: iterationsRun,
        maxIterations,
        url: activeUrl,
        dom,
        screenshotBase64,
        priorEvaluation: evaluatorContext,
        priorInjectorReasoning,
      },
    });

    modelId = result.modelId;
    lastReasoning = result.reasoning;
    done = result.done;
    priorInjectorReasoning = result.reasoning;

    if (result.code) {
      try {
        await executeInjectedPlaywrightCode(page, result.code);
      } catch {
        lastReasoning = `Code execution failed on iteration ${iterationsRun}.`;
        done = false;
        break;
      }
    }

    if (!done && iterationsRun < maxIterations) {
      await page.waitForTimeout(500).catch(() => undefined);
    }
    try {
      activeUrl = page.url();
    } catch {
      // page may still be navigating
    }
  }

  return { attempted: true, iterationsRun, done, lastReasoning, modelId, finalUrl: activeUrl };
}

export async function captureAndEvaluatePlaywrightObservation<TReview, TObservation>(
  options: CaptureAndEvaluatePlaywrightObservationOptions<TReview, TObservation>
): Promise<CaptureAndEvaluatePlaywrightObservationResult<TReview, TObservation>> {
  const currentUrl = options.currentUrl ?? safePageUrl(options.page);
  const pageTitle = normalizeOptionalText(await options.page.title().catch(() => null));
  const pageTextSnippet = normalizeOptionalText(
    (
      await options.page
        .locator(options.textSelector?.trim() || 'body')
        .first()
        .textContent()
        .catch(() => null)
    )?.replace(/\s+/g, ' ').slice(0, options.maxTextLength ?? 2_500) ?? null
  );
  const fingerprint = buildPlaywrightObservationFingerprint([
    currentUrl ?? '',
    pageTitle ?? '',
    pageTextSnippet ?? '',
    ...(options.extraFingerprintParts ?? []),
  ]);
  const observedAt = new Date().toISOString();
  const baseCapture: PlaywrightCapturedPageObservation = {
    currentUrl,
    pageTitle,
    pageTextSnippet,
    screenshotBase64: null,
    screenshotArtifactName: null,
    htmlArtifactName: null,
    fingerprint,
    observedAt,
  };

  if (
    options.previousObservation !== null &&
    options.previousObservation !== undefined &&
    options.previousFingerprint === fingerprint
  ) {
    return {
      observation: options.previousObservation,
      review: null,
      capture: baseCapture,
      deduped: true,
      injection: null,
      injectionReEvaluated: false,
    };
  }

  let screenshotBuffer: Buffer | null = null;
  let screenshotArtifactName: string | null = null;
  let htmlArtifactName: string | null = null;

  try {
    screenshotBuffer = await options.page.screenshot({ type: 'png' });
    if (typeof options.artifacts?.file === 'function') {
      const artifactPath = await options.artifacts.file(options.artifactKey, screenshotBuffer, {
        extension: 'png',
        mimeType: 'image/png',
        kind: options.screenshotKind?.trim() || 'screenshot',
      });
      screenshotArtifactName = toArtifactName(artifactPath);
    }
  } catch (error) {
    const logMessage = normalizeOptionalText(options.screenshotFailureLogKey);
    if (logMessage && typeof options.log === 'function') {
      options.log(logMessage, {
        error: error instanceof Error ? error.message : String(error ?? 'Unknown error'),
      });
    }
  }

  if (typeof options.artifacts?.html === 'function') {
    const htmlArtifact = await options.artifacts.html(options.artifactKey).catch(() => null);
    htmlArtifactName = toArtifactName(htmlArtifact);
  }

  let capture: PlaywrightCapturedPageObservation = {
    ...baseCapture,
    screenshotBase64: screenshotBuffer?.toString('base64') ?? null,
    screenshotArtifactName,
    htmlArtifactName,
  };
  let review = await options.evaluate(capture);

  let injection: PlaywrightInjectionAttemptResult | null = null;
  let injectionReEvaluated = false;

  if (options.injectOnEvaluation && options.injectOnEvaluation.shouldInject(review)) {
    injection = await runPlaywrightVerificationInjectionLoop(
      options.page,
      options.injectOnEvaluation,
      review,
      capture.currentUrl ?? ''
    );

    if (options.injectOnEvaluation.reEvaluateAfterInjection) {
      const postUrl = safePageUrl(options.page);
      const postTitle = normalizeOptionalText(await options.page.title().catch(() => null));
      const postTextSnippet = normalizeOptionalText(
        (
          await options.page
            .locator(options.textSelector?.trim() || 'body')
            .first()
            .textContent()
            .catch(() => null)
        )?.replace(/\s+/g, ' ').slice(0, options.maxTextLength ?? 2_500) ?? null
      );
      const postFingerprint = buildPlaywrightObservationFingerprint([
        postUrl ?? '',
        postTitle ?? '',
        postTextSnippet ?? '',
        ...(options.extraFingerprintParts ?? []),
      ]);

      let postScreenshotBuffer: Buffer | null = null;
      let postScreenshotArtifactName: string | null = null;
      try {
        postScreenshotBuffer = await options.page.screenshot({ type: 'png' });
        if (typeof options.artifacts?.file === 'function') {
          const artifactPath = await options.artifacts.file(
            `${options.artifactKey}-post-inject`,
            postScreenshotBuffer,
            { extension: 'png', mimeType: 'image/png', kind: options.screenshotKind?.trim() || 'screenshot' }
          );
          postScreenshotArtifactName = toArtifactName(artifactPath);
        }
      } catch {
        // proceed without screenshot
      }

      capture = {
        currentUrl: postUrl,
        pageTitle: postTitle,
        pageTextSnippet: postTextSnippet,
        screenshotBase64: postScreenshotBuffer?.toString('base64') ?? null,
        screenshotArtifactName: postScreenshotArtifactName,
        htmlArtifactName: null,
        fingerprint: postFingerprint,
        observedAt: new Date().toISOString(),
      };
      review = await options.evaluate(capture);
      injectionReEvaluated = true;
    }
  }

  return {
    observation: options.buildObservation({ capture, review }),
    review,
    capture,
    deduped: false,
    injection,
    injectionReEvaluated,
  };
}

export async function evaluateStructuredPlaywrightScreenshotWithAI<TParsed>(
  options: PlaywrightStructuredScreenshotEvaluationOptions<TParsed>
): Promise<PlaywrightStructuredScreenshotEvaluationResult<TParsed>> {
  if (options.screenshotBase64 === null) {
    return {
      parsed: null,
      rawOutput: null,
      modelId: null,
      error: 'Screenshot input is required.',
    };
  }

  try {
    const completion = await evaluateStepWithAI({
      inputSource: 'screenshot',
      data: options.screenshotBase64,
      systemPrompt:
        options.promptPayload === undefined
          ? options.systemPrompt
          : [options.systemPrompt, JSON.stringify(options.promptPayload, null, 2)].join('\n\n'),
    });

    return {
      parsed: options.responseSchema.parse(JSON.parse(completion.output) as unknown),
      rawOutput: completion.output,
      modelId: completion.modelId,
      error: null,
    };
  } catch (error) {
    return {
      parsed: null,
      rawOutput: null,
      modelId: null,
      error: error instanceof Error ? error.message : String(error ?? 'Unknown error'),
    };
  }
}

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
>(
  options: {
    profile: Pick<
      PlaywrightVerificationReviewProfile<TParams, TProfileReview, TExtra>,
      'observation'
    >;
    params: TParams;
    review: TBaseReview;
    capture: Pick<PlaywrightCapturedPageObservation, 'observedAt' | 'fingerprint'>;
    iteration: number;
    loopDecision: TLoopDecision;
    stableForMs: number | null;
  }
): TBaseReview &
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

export type RunPlaywrightVerificationReviewCaptureOptions<
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationReviewLike,
  TObservation extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
> = {
  profile: PlaywrightVerificationReviewProfile<TParams, TObservation, TExtra>;
  params: TParams;
  currentUrl: string | null;
  previousObservation: TObservation | null;
  page: Page;
  artifacts?: PlaywrightObservationArtifacts & {
    json?: ((key: string, data: unknown) => Promise<unknown>) | null | undefined;
  };
  log?: ((message: string, context?: unknown) => void) | null | undefined;
  screenshotFailureLogKey?: string | null | undefined;
  evaluate: (
    capture: PlaywrightCapturedPageObservation,
    params: TParams
  ) => Promise<TReview>;
  commitObservation: (input: {
    review: TReview;
    observation: TObservation;
  }) => readonly TObservation[] | Promise<readonly TObservation[]>;
  upsertStep: (step: {
    key: string;
    status: 'running' | 'failed' | 'completed';
    candidateId: string;
    candidateRank: number;
    message: string;
    url: string | null;
    resultCode?: string;
    warning?: string | null;
    details?: Array<{ label: string; value?: string | null }>;
    group?: string;
    label?: string;
  }) => void | Promise<void>;
  /** When set, runs the AI code injector after each evaluation that passes `shouldInject` */
  injectOnEvaluation?: PlaywrightVerificationInjectionConfig<TReview> | null | undefined;
};

export async function runPlaywrightVerificationReviewCapture<
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationReviewLike,
  TObservation extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
>(
  options: RunPlaywrightVerificationReviewCaptureOptions<
    TParams,
    TReview,
    TObservation,
    TExtra
  >
): Promise<TObservation | null> {
  const { artifactKey, extraFingerprintParts } =
    resolvePlaywrightVerificationReviewCaptureContext(
      options.profile.capture,
      options.params
    );

  await options.upsertStep({
    key: options.profile.runtime.step.key,
    status: 'running',
    candidateId: options.params.candidateId,
    candidateRank: options.params.candidateRank,
    message: options.profile.runtime.step.runningMessage,
    url: options.currentUrl,
    ...(options.profile.runtime.step.group
      ? { group: options.profile.runtime.step.group }
      : {}),
    ...(options.profile.runtime.step.label
      ? { label: options.profile.runtime.step.label }
      : {}),
  });

  const { observation, review, deduped, injection } =
    await captureAndEvaluatePlaywrightObservation<TReview, TObservation>({
      page: options.page,
      artifacts: options.artifacts,
      artifactKey,
      currentUrl: options.currentUrl,
      previousObservation: options.previousObservation,
      previousFingerprint: options.previousObservation?.fingerprint ?? null,
      extraFingerprintParts,
      log: options.log,
      screenshotFailureLogKey:
        options.screenshotFailureLogKey ?? options.profile.screenshotFailureLogKey,
      evaluate: (capture) => options.evaluate(capture, options.params),
      buildObservation: ({ capture, review: nextReview }) =>
        createPlaywrightVerificationObservationFromProfile({
          profile: options.profile,
          params: options.params,
          review: nextReview,
          capture,
          iteration: options.params.iteration,
          loopDecision: options.params.loopDecision,
          stableForMs: options.params.stableForMs,
        }) as TObservation,
      injectOnEvaluation: options.injectOnEvaluation ?? null,
    });

  if (deduped) {
    return observation;
  }

  const nextReview = review!;
  const observations = await options.commitObservation({
    review: nextReview,
    observation,
  });

  const baseDetails = buildPlaywrightVerificationReviewDetailsFromProfile(observation, options.profile);
  const injectionDetails: Array<{ label: string; value?: string | null }> = injection
    ? [
        { label: 'AI inject iterations', value: String(injection.iterationsRun) },
        { label: 'AI inject done', value: String(injection.done) },
        { label: 'AI inject model', value: injection.modelId },
        { label: 'AI inject reasoning', value: injection.lastReasoning },
        { label: 'AI inject final URL', value: injection.finalUrl },
      ]
    : [];

  await finalizePlaywrightVerificationReview({
    runtime: options.profile.runtime,
    artifactKey,
    artifacts: options.artifacts,
    review: nextReview,
    observations,
    currentUrl: options.currentUrl,
    details: [...baseDetails, ...injectionDetails],
    log: options.log,
    analysisFailureLogKey: options.profile.analysisFailureLogKey,
    upsertStep: (step) =>
      options.upsertStep({
        ...step,
        candidateId: options.params.candidateId,
        candidateRank: options.params.candidateRank,
      }),
  });

  return observation;
}

export const buildPlaywrightVerificationReviewDetails = <
  TReview extends PlaywrightVerificationObservationLike,
>(
  review: TReview,
  extraDetails: Array<{ label: string; value?: string | null }> = []
): Array<{ label: string; value?: string | null }> => [
  { label: 'Observation iteration', value: String(review.iteration) },
  { label: 'Loop decision', value: normalizeOptionalText(review.loopDecision) },
  { label: 'Observed at', value: normalizeOptionalText(review.observedAt) },
  {
    label: 'Stable clear ms',
    value:
      typeof review.stableForMs === 'number' ? String(review.stableForMs) : null,
  },
  ...extraDetails,
  { label: 'Review status', value: normalizeOptionalText(review.status) },
  { label: 'Challenge type', value: normalizeOptionalText(review.challengeType) },
  { label: 'Visible question', value: normalizeOptionalText(review.visibleQuestion) },
  {
    label: 'Manual action required',
    value:
      typeof review.manualActionRequired === 'boolean'
        ? String(review.manualActionRequired)
        : null,
  },
  { label: 'Evaluator model', value: normalizeOptionalText(review.modelId) },
  {
    label: 'Screenshot artifact',
    value: normalizeOptionalText(review.screenshotArtifactName),
  },
  { label: 'HTML artifact', value: normalizeOptionalText(review.htmlArtifactName) },
  { label: 'Review error', value: normalizeOptionalText(review.error) },
];

export type PlaywrightVerificationReviewDetailsAdapter<
  TReview extends PlaywrightVerificationObservationLike,
> = (review: TReview) => Array<{ label: string; value?: string | null }>;

export type PlaywrightVerificationReviewDetailDescriptor<
  TReview extends PlaywrightVerificationObservationLike,
> = {
  label: string;
  value: keyof TReview | ((review: TReview) => unknown);
};

const normalizePlaywrightVerificationReviewDetailValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return normalizeOptionalText(value);
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return null;
};

const resolvePlaywrightVerificationReviewDetailValue = <
  TReview extends PlaywrightVerificationObservationLike,
>(
  review: TReview,
  selector: keyof TReview | ((review: TReview) => unknown)
): string | null =>
  normalizePlaywrightVerificationReviewDetailValue(
    typeof selector === 'function' ? selector(review) : review[selector]
  );

export const buildPlaywrightVerificationReviewExtraDetailsFromDescriptors = <
  TReview extends PlaywrightVerificationObservationLike,
>(
  review: TReview,
  descriptors: readonly PlaywrightVerificationReviewDetailDescriptor<TReview>[]
): Array<{ label: string; value?: string | null }> =>
  descriptors.map((descriptor) => ({
    label: descriptor.label,
    value: resolvePlaywrightVerificationReviewDetailValue(review, descriptor.value),
  }));

export const buildPlaywrightVerificationReviewDetailsWithDescriptors = <
  TReview extends PlaywrightVerificationObservationLike,
>(
  review: TReview,
  descriptors: readonly PlaywrightVerificationReviewDetailDescriptor<TReview>[]
): Array<{ label: string; value?: string | null }> =>
  buildPlaywrightVerificationReviewDetails(
    review,
    buildPlaywrightVerificationReviewExtraDetailsFromDescriptors(review, descriptors)
  );

export const buildPlaywrightVerificationReviewDetailsFromProfile = <
  TParams,
  TReview extends PlaywrightVerificationObservationLike,
>(
  review: TReview,
  profile: Pick<PlaywrightVerificationReviewProfile<TParams, TReview>, 'detailDescriptors'>
): Array<{ label: string; value?: string | null }> =>
  buildPlaywrightVerificationReviewDetailsWithDescriptors(
    review,
    profile.detailDescriptors
  );

export const buildPlaywrightVerificationReviewDetailsWithAdapter = <
  TReview extends PlaywrightVerificationObservationLike,
>(
  review: TReview,
  adapter: PlaywrightVerificationReviewDetailsAdapter<TReview>
): Array<{ label: string; value?: string | null }> =>
  buildPlaywrightVerificationReviewDetails(review, adapter(review));

export type FinalizePlaywrightVerificationReviewOptions<
  TReview extends PlaywrightVerificationReviewLike,
  TObservation,
> = {
  runtime: PlaywrightVerificationReviewRuntimeConfig;
  artifactKey: string;
  artifacts?: PlaywrightObservationArtifacts & {
    json?: ((key: string, data: unknown) => Promise<unknown>) | null | undefined;
  };
  review: TReview;
  observations: readonly TObservation[];
  currentUrl: string | null;
  details: Array<{ label: string; value?: string | null }>;
  log?: ((message: string, context?: unknown) => void) | null | undefined;
  analysisFailureLogKey?: string | null | undefined;
  upsertStep: (step: {
    key: string;
    status: 'failed' | 'completed';
    resultCode: string;
    message: string;
    warning: string | null;
    url: string | null;
    details: Array<{ label: string; value?: string | null }>;
    group?: string;
    label?: string;
  }) => void | Promise<void>;
};

export const finalizePlaywrightVerificationReview = async <
  TReview extends PlaywrightVerificationReviewLike,
  TObservation,
>(
  options: FinalizePlaywrightVerificationReviewOptions<TReview, TObservation>
): Promise<PlaywrightVerificationReviewStepOutcome> => {
  if (options.review.status === 'capture_only' && options.review.error !== null) {
    const logMessage = normalizeOptionalText(options.analysisFailureLogKey);
    if (logMessage && typeof options.log === 'function') {
      options.log(logMessage, {
        error: options.review.error,
      });
    }
  }

  const stepOutcome = resolvePlaywrightVerificationReviewStepOutcome(
    options.review,
    options.runtime.step.messages
  );

  await options.upsertStep({
    key: options.runtime.step.key,
    status: stepOutcome.status,
    resultCode: stepOutcome.resultCode,
    message: stepOutcome.message,
    warning: stepOutcome.warning,
    url: options.currentUrl,
    details: options.details,
    ...(options.runtime.step.group ? { group: options.runtime.step.group } : {}),
    ...(options.runtime.step.label ? { label: options.runtime.step.label } : {}),
  });

  await persistPlaywrightObservationReviewArtifacts({
    artifacts: options.artifacts,
    ...resolvePlaywrightVerificationReviewArtifactKeys(
      options.artifactKey,
      options.runtime.artifacts
    ),
    review: options.review,
    observations: options.observations,
  });

  return stepOutcome;
};

export async function persistPlaywrightObservationReviewArtifacts<
  TReview,
  TObservation,
>(
  options: {
    artifacts?: PlaywrightObservationArtifacts & {
      json?: ((key: string, data: unknown) => Promise<unknown>) | null | undefined;
    };
    analysisArtifactKey: string;
    historyArtifactKey: string;
    review: TReview;
    observations: readonly TObservation[];
  }
): Promise<void> {
  if (typeof options.artifacts?.json !== 'function') {
    return;
  }

  await options.artifacts
    .json(options.analysisArtifactKey, options.review)
    .catch(() => undefined);
  await options.artifacts
    .json(options.historyArtifactKey, options.observations)
    .catch(() => undefined);
}

export type PlaywrightObservationLoopDecision =
  | 'blocked'
  | 'awaiting_stable_clear'
  | 'resolved'
  | 'page_closed'
  | 'timeout';

export type PlaywrightObservationLoopSnapshot<TState> = {
  state: TState | null;
  blocked: boolean;
  currentUrl?: string | null | undefined;
};

export type PlaywrightObservationLoopObserveInput<TState> = {
  iteration: number;
  decision: PlaywrightObservationLoopDecision;
  snapshot: PlaywrightObservationLoopSnapshot<TState>;
  stableForMs: number | null;
};

export type PlaywrightObservationLoopOptions<TState, TObservation> = {
  timeoutMs: number;
  stableClearWindowMs: number;
  intervalMs?: number | null | undefined;
  initialSnapshot: PlaywrightObservationLoopSnapshot<TState>;
  isPageClosed: () => boolean;
  wait: (ms: number) => Promise<void>;
  readSnapshot: () => Promise<PlaywrightObservationLoopSnapshot<TState>>;
  observe: (
    input: PlaywrightObservationLoopObserveInput<TState>
  ) => Promise<TObservation | null>;
};

export type PlaywrightVerificationObservationLoopOptions<
  TState,
  TObservation,
  TParams extends PlaywrightVerificationCaptureParamsBase,
> = Omit<PlaywrightObservationLoopOptions<TState, TObservation>, 'observe'> & {
  buildCaptureParams: (
    input: PlaywrightObservationLoopObserveInput<TState>
  ) => TParams;
  captureObservation: (params: TParams) => Promise<TObservation | null>;
};

export type PlaywrightVerificationObservationLoopAdapter<
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
> = {
  buildCaptureParams: (
    input: PlaywrightObservationLoopObserveInput<TState>,
    baseParams: TBaseParams
  ) => TParams;
};

export const createPlaywrightVerificationObservationLoopAdapter = <
  TState,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
>(
  adapter: PlaywrightVerificationObservationLoopAdapter<TState, TBaseParams, TParams>
): PlaywrightVerificationObservationLoopAdapter<TState, TBaseParams, TParams> => adapter;

export type PlaywrightVerificationObservationLoopWithAdapterOptions<
  TState,
  TObservation,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
> = Omit<
  PlaywrightVerificationObservationLoopOptions<TState, TObservation, TParams>,
  'buildCaptureParams'
> & {
  adapter: PlaywrightVerificationObservationLoopAdapter<TState, TBaseParams, TParams>;
  baseParams: TBaseParams;
};

export type PlaywrightVerificationObservationLoopWithProfileOptions<
  TState,
  TObservation,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
> = Omit<
  PlaywrightVerificationObservationLoopOptions<TState, TObservation, TParams>,
  'buildCaptureParams'
> & {
  profile: PlaywrightVerificationReviewLoopProfile<
    TState,
    TBaseParams,
    TParams,
    TReview,
    TExtra
  >;
  baseParams: TBaseParams;
};

export type PlaywrightObservationLoopResult<TState, TObservation> = {
  resolved: boolean;
  finalDecision: Extract<
    PlaywrightObservationLoopDecision,
    'resolved' | 'page_closed' | 'timeout'
  >;
  finalSnapshot: PlaywrightObservationLoopSnapshot<TState> | null;
  stableForMs: number | null;
  iterations: number;
  lastObservation: TObservation | null;
};

export async function runPlaywrightObservationLoop<TState, TObservation>(
  options: PlaywrightObservationLoopOptions<TState, TObservation>
): Promise<PlaywrightObservationLoopResult<TState, TObservation>> {
  const intervalMs =
    typeof options.intervalMs === 'number' && Number.isFinite(options.intervalMs)
      ? Math.max(0, Math.trunc(options.intervalMs))
      : 2_000;

  let iteration = 1;
  let stableSince: number | null = null;
  let lastObservation = await options.observe({
    iteration,
    decision: options.initialSnapshot.blocked ? 'blocked' : 'awaiting_stable_clear',
    snapshot: options.initialSnapshot,
    stableForMs: null,
  });

  if (options.isPageClosed()) {
    iteration += 1;
    lastObservation = await options.observe({
      iteration,
      decision: 'page_closed',
      snapshot: {
        state: null,
        blocked: options.initialSnapshot.blocked,
        currentUrl: options.initialSnapshot.currentUrl ?? null,
      },
      stableForMs: null,
    });
    return {
      resolved: false,
      finalDecision: 'page_closed',
      finalSnapshot: null,
      stableForMs: null,
      iterations: iteration,
      lastObservation,
    };
  }

  const deadline = Date.now() + options.timeoutMs;

  while (Date.now() < deadline) {
    if (options.isPageClosed()) {
      iteration += 1;
      lastObservation = await options.observe({
        iteration,
        decision: 'page_closed',
        snapshot: {
          state: null,
          blocked: true,
          currentUrl: null,
        },
        stableForMs: null,
      });
      return {
        resolved: false,
        finalDecision: 'page_closed',
        finalSnapshot: null,
        stableForMs: null,
        iterations: iteration,
        lastObservation,
      };
    }

    await options.wait(intervalMs);

    if (options.isPageClosed()) {
      iteration += 1;
      lastObservation = await options.observe({
        iteration,
        decision: 'page_closed',
        snapshot: {
          state: null,
          blocked: true,
          currentUrl: null,
        },
        stableForMs: null,
      });
      return {
        resolved: false,
        finalDecision: 'page_closed',
        finalSnapshot: null,
        stableForMs: null,
        iterations: iteration,
        lastObservation,
      };
    }

    const snapshot = await options.readSnapshot();
    iteration += 1;

    if (snapshot.blocked) {
      stableSince = null;
      lastObservation = await options.observe({
        iteration,
        decision: 'blocked',
        snapshot,
        stableForMs: null,
      });
      continue;
    }

    if (stableSince === null) {
      stableSince = Date.now();
    }
    const stableForMs = Math.max(0, Date.now() - stableSince);
    const decision: PlaywrightObservationLoopDecision =
      stableForMs >= options.stableClearWindowMs ? 'resolved' : 'awaiting_stable_clear';
    lastObservation = await options.observe({
      iteration,
      decision,
      snapshot,
      stableForMs,
    });

    if (decision === 'resolved') {
      return {
        resolved: true,
        finalDecision: 'resolved',
        finalSnapshot: snapshot,
        stableForMs,
        iterations: iteration,
        lastObservation,
      };
    }
  }

  iteration += 1;
  const timeoutSnapshot = options.isPageClosed()
    ? null
    : await options.readSnapshot().catch(() => null);
  const stableForMs = stableSince === null ? null : Math.max(0, Date.now() - stableSince);
  lastObservation = await options.observe({
    iteration,
    decision: 'timeout',
    snapshot:
      timeoutSnapshot ?? {
        state: null,
        blocked: true,
        currentUrl: null,
      },
    stableForMs,
  });

  return {
    resolved: false,
    finalDecision: 'timeout',
    finalSnapshot: timeoutSnapshot,
    stableForMs,
    iterations: iteration,
    lastObservation,
  };
}

export async function runPlaywrightVerificationObservationLoop<
  TState,
  TObservation,
  TParams extends PlaywrightVerificationCaptureParamsBase,
>(
  options: PlaywrightVerificationObservationLoopOptions<
    TState,
    TObservation,
    TParams
  >
): Promise<PlaywrightObservationLoopResult<TState, TObservation>> {
  return runPlaywrightObservationLoop<TState, TObservation>({
    timeoutMs: options.timeoutMs,
    stableClearWindowMs: options.stableClearWindowMs,
    intervalMs: options.intervalMs,
    initialSnapshot: options.initialSnapshot,
    isPageClosed: options.isPageClosed,
    wait: options.wait,
    readSnapshot: options.readSnapshot,
    observe: (input) => options.captureObservation(options.buildCaptureParams(input)),
  });
}

export async function runPlaywrightVerificationObservationLoopWithAdapter<
  TState,
  TObservation,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
>(
  options: PlaywrightVerificationObservationLoopWithAdapterOptions<
    TState,
    TObservation,
    TBaseParams,
    TParams
  >
): Promise<PlaywrightObservationLoopResult<TState, TObservation>> {
  return runPlaywrightVerificationObservationLoop<TState, TObservation, TParams>({
    timeoutMs: options.timeoutMs,
    stableClearWindowMs: options.stableClearWindowMs,
    intervalMs: options.intervalMs,
    initialSnapshot: options.initialSnapshot,
    isPageClosed: options.isPageClosed,
    wait: options.wait,
    readSnapshot: options.readSnapshot,
    buildCaptureParams: (input) =>
      options.adapter.buildCaptureParams(input, options.baseParams),
    captureObservation: options.captureObservation,
  });
}

export async function runPlaywrightVerificationObservationLoopWithProfile<
  TState,
  TObservation,
  TBaseParams,
  TParams extends PlaywrightVerificationCaptureParamsBase,
  TReview extends PlaywrightVerificationObservationLike,
  TExtra extends object = Record<never, never>,
>(
  options: PlaywrightVerificationObservationLoopWithProfileOptions<
    TState,
    TObservation,
    TBaseParams,
    TParams,
    TReview,
    TExtra
  >
): Promise<PlaywrightObservationLoopResult<TState, TObservation>> {
  return runPlaywrightVerificationObservationLoopWithAdapter<
    TState,
    TObservation,
    TBaseParams,
    TParams
  >({
    timeoutMs: options.timeoutMs,
    stableClearWindowMs: options.stableClearWindowMs,
    intervalMs: options.intervalMs,
    initialSnapshot: options.initialSnapshot,
    isPageClosed: options.isPageClosed,
    wait: options.wait,
    readSnapshot: options.readSnapshot,
    adapter: options.profile.adapter,
    baseParams: options.baseParams,
    captureObservation: options.captureObservation,
  });
}

export async function evaluateStepWithAI(
  options: PlaywrightStepEvaluateOptions
): Promise<PlaywrightStepEvaluateResult> {
  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'playwright.ai_evaluator_step',
    {
      defaultSystemPrompt: EVALUATOR_DEFAULT_SYSTEM_PROMPT,
      defaultModelId: 'claude-sonnet-4-6',
    }
  );

  const modelId = brainConfig.modelId;
  const systemPrompt =
    options.systemPrompt?.trim() || brainConfig.systemPrompt || EVALUATOR_DEFAULT_SYSTEM_PROMPT;
  const { inputSource, data } = options;
  const isImageInput = inputSource === 'screenshot';

  if (isImageInput && !isBrainModelVisionCapable(modelId)) {
    throw new Error(
      `Model "${modelId}" does not support image inputs. Use a vision-capable model (e.g. claude-sonnet-4-6, gpt-4o, gemini-2.0-flash) for screenshot evaluation. Configure this in /admin/brain?tab=routing under Playwright.`
    );
  }

  const userContent: unknown = isImageInput
    ? [
        { type: 'image_url' as const, image_url: { url: `data:image/png;base64,${data}` } },
        {
          type: 'text' as const,
          text: 'Evaluate the current state of the page based on this screenshot.',
        },
      ]
    : `${
        inputSource === 'html'
          ? 'Page HTML:\n'
          : inputSource === 'text_content'
            ? 'Page text content:\n'
            : 'Element text:\n'
      }${data}`;

  const result = await runBrainChatCompletion({
    modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent as string },
    ],
    temperature: brainConfig.temperature ?? 0,
  });

  return { output: result.text, modelId: result.modelId };
}

export type PlaywrightStepInjectContext = {
  iteration: number;
  maxIterations: number;
  url: string;
  dom?: string | null | undefined;
  /** Base64-encoded PNG screenshot of the current page; used for vision-capable models */
  screenshotBase64?: string | null | undefined;
  priorEvaluation?: string | null | undefined;
  priorInjectorReasoning?: string | null | undefined;
};

export type PlaywrightStepInjectOptions = {
  goal: string;
  systemPrompt?: string | null | undefined;
  context: PlaywrightStepInjectContext;
};

export type PlaywrightStepInjectResult = {
  code: string;
  done: boolean;
  reasoning: string;
  modelId: string;
};

const buildInjectorUserMessage = (options: PlaywrightStepInjectOptions): string => {
  const { goal, context } = options;
  const lines: string[] = [
    `Goal: ${goal}`,
    `Iteration: ${context.iteration} of ${context.maxIterations}`,
    `Current URL: ${context.url}`,
  ];

  if (context.priorEvaluation) {
    lines.push(`\nPrior AI Evaluator output:\n${context.priorEvaluation}`);
  }

  if (context.priorInjectorReasoning) {
    lines.push(`\nPrior injector reasoning:\n${context.priorInjectorReasoning}`);
  }

  if (context.dom) {
    const truncated =
      context.dom.length > 8000
        ? `${context.dom.slice(0, 8000)}\n... [truncated at 8000 chars]`
        : context.dom;
    lines.push(`\nCurrent page DOM:\n${truncated}`);
  }

  lines.push(
    '\nRespond with JSON only: { "code": "...", "done": true|false, "reasoning": "..." }'
  );

  return lines.join('\n');
};

const parseInjectorResponse = (
  text: string,
  modelId: string
): PlaywrightStepInjectResult => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      code: typeof parsed['code'] === 'string' ? parsed['code'] : '',
      done: parsed['done'] === true,
      reasoning: typeof parsed['reasoning'] === 'string' ? parsed['reasoning'] : '',
      modelId,
    };
  } catch {
    return {
      code: cleaned,
      done: true,
      reasoning: 'Direct code response (JSON parse failed).',
      modelId,
    };
  }
};

export async function injectCodeWithAI(
  options: PlaywrightStepInjectOptions
): Promise<PlaywrightStepInjectResult> {
  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'playwright.ai_code_injector',
    {
      defaultSystemPrompt: INJECTOR_DEFAULT_SYSTEM_PROMPT,
      defaultModelId: 'claude-sonnet-4-6',
    }
  );

  const systemPrompt =
    options.systemPrompt?.trim() || brainConfig.systemPrompt || INJECTOR_DEFAULT_SYSTEM_PROMPT;
  const userMessage = buildInjectorUserMessage(options);
  const screenshotBase64 = options.context.screenshotBase64;

  const userContent: unknown =
    screenshotBase64 && isBrainModelVisionCapable(brainConfig.modelId)
      ? [
          {
            type: 'image_url' as const,
            image_url: { url: `data:image/png;base64,${screenshotBase64}` },
          },
          { type: 'text' as const, text: userMessage },
        ]
      : userMessage;

  const result = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent as string },
    ],
    temperature: brainConfig.temperature ?? 0.2,
  });

  return parseInjectorResponse(result.text, result.modelId);
}
