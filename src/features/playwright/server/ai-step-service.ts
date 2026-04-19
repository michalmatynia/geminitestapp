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
9. When a screenshot is provided, use it to understand the current visual state of the page before writing code.
10. When "Prior execution error" is present, your previous code threw that error. Fix the approach — do NOT repeat the same failing code.`;

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
  json?: ((key: string, data: unknown) => Promise<unknown>) | null | undefined;
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
  /**
   * Return true to trigger the injector after this evaluation result.
   * The current page capture is provided as a second argument for URL/screenshot-based decisions.
   */
  shouldInject: (review: TReview, capture: PlaywrightCapturedPageObservation) => boolean;
  /**
   * Natural-language goal for the AI code injector, or a function deriving it from the review
   * and current page capture.
   */
  goal: string | ((review: TReview, capture: PlaywrightCapturedPageObservation) => string);
  /** Optional system prompt override for the injector */
  systemPrompt?: string | null | undefined;
  /** Maximum injector iterations per observation (default: 3) */
  maxIterations?: number | null | undefined;
  /**
   * Serialize the evaluation result into a text context string for the injector (default: JSON).
   * The current page capture is provided as a second argument.
   */
  buildEvaluatorContext?: ((review: TReview, capture: PlaywrightCapturedPageObservation) => string) | null | undefined;
  /**
   * When true, re-captures the page state and re-runs the evaluate function after injection
   * completes. The returned observation, review, and capture reflect the post-injection state.
   */
  reEvaluateAfterInjection?: boolean | null | undefined;
  /**
   * Optional log callback — called once per injection iteration with a status message and context.
   * Useful for surfacing real-time progress in the parent step log.
   */
  log?: ((message: string, context?: unknown) => void) | null | undefined;
  /**
   * Optional structured callback — called once per injection iteration with the full iteration
   * record. Prefer this over `log` when you need typed access to code, reasoning, and errors.
   */
  onIterationResult?: ((record: PlaywrightInjectionIterationRecord) => void) | null | undefined;
  /**
   * When true, waits for the page to reach 'domcontentloaded' after each code execution before
   * proceeding to the next iteration. Useful when injected code triggers navigation.
   * Defaults to true — set to false to skip and use only the fixed inter-iteration delay.
   */
  waitForNavigation?: boolean | null | undefined;
  /**
   * Maximum wall-clock milliseconds the entire injection loop may run before it is aborted,
   * regardless of how many iterations have completed. No timeout is enforced when omitted.
   */
  timeoutMs?: number | null | undefined;
  /**
   * When true (default), maintains a multi-turn conversation across iterations so the AI can
   * see its exact prior code and responses rather than relying on summarized context strings.
   * Set to false to revert to the single-turn-per-iteration approach.
   */
  useConversationHistory?: boolean | null | undefined;
  /**
   * Optional per-iteration evaluator — called at the start of each iteration after capturing
   * a fresh screenshot and DOM, but before generating code. When `done` is true the loop exits
   * without producing or executing any code. When `done` is false its `context` string is
   * forwarded to the code generator as `freshEvaluation`, which is always included in the user
   * message (even on continuation turns), giving the AI an up-to-date view of the page.
   */
  evaluateCapture?: ((capture: PlaywrightVisionIterationCapture) => Promise<PlaywrightVisionIterationEvaluation>) | null | undefined;
  /**
   * Artifact callbacks used to persist per-iteration screenshots.
   * When provided together with `artifactKey`, each iteration's screenshot is saved as
   * `${artifactKey}-inject-iter-${n}` via `artifacts.file`.
   * Automatically forwarded from `captureAndEvaluatePlaywrightObservation` when not set.
   */
  artifacts?: PlaywrightObservationArtifacts | null | undefined;
  /**
   * Key prefix for per-iteration screenshot artifacts.
   * Required when `artifacts` is provided; no screenshots are saved when omitted.
   * Automatically forwarded from `captureAndEvaluatePlaywrightObservation` when not set.
   */
  artifactKey?: string | null | undefined;
  /**
   * Maximum number of consecutive execution errors before aborting the loop early.
   * Resets to zero whenever an iteration executes without error.
   * No limit when omitted — the loop always runs to `maxIterations`.
   */
  maxConsecutiveErrors?: number | null | undefined;
};

export type PlaywrightInjectionIterationEvaluationRecord = {
  /** Whether the evaluator reported the goal as achieved (causes loop exit without code generation) */
  done: boolean;
  /** Serialized page-state context passed to the code generator; empty string when done=true */
  context: string;
  /** Human-readable reasoning provided by the evaluator (populated when done=true) */
  reasoning?: string | null | undefined;
};

export type PlaywrightInjectionIterationRecord = {
  iteration: number;
  code: string;
  done: boolean;
  reasoning: string;
  /** Error thrown when executing the generated code; null when execution succeeded */
  executionError: string | null;
  /** Page URL captured immediately after code execution */
  urlAfter: string | null;
  /**
   * Artifact name of the screenshot captured at the start of this iteration.
   * Null when artifact saving is not configured.
   */
  screenshotArtifactName: string | null;
  /**
   * Artifact name of the HTML snapshot captured at the start of this iteration.
   * Null when artifact saving is not configured.
   */
  htmlArtifactName: string | null;
  /**
   * Result of the per-iteration evaluator (`evaluateCapture` / `evaluate`) for this iteration.
   * Null when no per-iteration evaluator is configured.
   */
  evaluation: PlaywrightInjectionIterationEvaluationRecord | null;
};

export type PlaywrightInjectionAttemptResult = {
  attempted: boolean;
  iterationsRun: number;
  done: boolean;
  lastReasoning: string | null;
  modelId: string | null;
  /** Page URL after the injection loop completed */
  finalUrl: string | null;
  /** Per-iteration records for diagnostics and artifact serialization */
  iterations: readonly PlaywrightInjectionIterationRecord[];
  /** Full conversation history accumulated during the loop; empty when useConversationHistory is false */
  conversationHistory: readonly PlaywrightInjectionConversationMessage[];
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
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
    ...args: string[]
  ) => (...a: unknown[]) => Promise<unknown>;
  await new AsyncFunction('page', code)(page);
};

async function runPlaywrightVerificationInjectionLoop<TReview>(
  page: Page,
  config: PlaywrightVerificationInjectionConfig<TReview>,
  review: TReview,
  capture: PlaywrightCapturedPageObservation
): Promise<PlaywrightInjectionAttemptResult> {
  const currentUrl = capture.currentUrl ?? '';
  const maxIterations =
    typeof config.maxIterations === 'number' &&
    Number.isFinite(config.maxIterations) &&
    config.maxIterations > 0
      ? Math.trunc(config.maxIterations)
      : 3;
  const goal = typeof config.goal === 'function' ? config.goal(review, capture) : config.goal;
  const evaluatorContext =
    typeof config.buildEvaluatorContext === 'function'
      ? config.buildEvaluatorContext(review, capture)
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
  let priorExecutionError: string | null = null;
  let activeUrl = currentUrl;
  const shouldWaitForNavigation = config.waitForNavigation !== false;
  const iterationRecords: PlaywrightInjectionIterationRecord[] = [];
  const seenCodes = new Set<string>();
  const useHistory = config.useConversationHistory !== false;
  const conversationHistory: PlaywrightInjectionConversationMessage[] = [];
  const loopTimeoutMs =
    typeof config.timeoutMs === 'number' && Number.isFinite(config.timeoutMs) && config.timeoutMs > 0
      ? config.timeoutMs
      : null;
  const loopStartedAt = loopTimeoutMs !== null ? Date.now() : 0;
  const maxConsecErrors =
    typeof config.maxConsecutiveErrors === 'number' &&
    Number.isFinite(config.maxConsecutiveErrors) &&
    config.maxConsecutiveErrors > 0
      ? config.maxConsecutiveErrors
      : null;
  let consecutiveErrors = 0;

  while (iterationsRun < maxIterations && !done) {
    if (loopTimeoutMs !== null && Date.now() - loopStartedAt >= loopTimeoutMs) {
      lastReasoning = `Injection loop timed out after ${loopTimeoutMs}ms.`;
      if (typeof config.log === 'function') {
        config.log(`AI inject timed out after ${loopTimeoutMs}ms`, { iterationsRun });
      }
      break;
    }
    iterationsRun++;

    const [dom, screenshotBuffer] = await Promise.all([
      page.content().catch(() => null),
      page.screenshot({ type: 'png' }).catch(() => null),
    ]);
    const screenshotBase64 = screenshotBuffer ? screenshotBuffer.toString('base64') : null;

    let iterScreenshotArtifactName: string | null = null;
    let iterHtmlArtifactName: string | null = null;
    if (config.artifactKey) {
      const iterKey = `${config.artifactKey}-inject-iter-${iterationsRun}`;
      if (screenshotBuffer && typeof config.artifacts?.file === 'function') {
        try {
          const artifactPath = await config.artifacts.file(iterKey, screenshotBuffer, {
            extension: 'png',
            mimeType: 'image/png',
            kind: 'screenshot',
          });
          iterScreenshotArtifactName = toArtifactName(artifactPath);
        } catch {
          // proceed without saving artifact
        }
      }
      if (typeof config.artifacts?.html === 'function') {
        iterHtmlArtifactName = toArtifactName(await config.artifacts.html(iterKey).catch(() => null));
      }
    }

    // Per-iteration evaluation — refreshes context and can short-circuit before code generation
    let iterationFreshContext: string | null = null;
    let iterationEvalRecord: PlaywrightInjectionIterationEvaluationRecord | null = null;
    if (typeof config.evaluateCapture === 'function') {
      const iterEval = await config.evaluateCapture({
        screenshotBase64,
        dom,
        url: activeUrl,
        iteration: iterationsRun,
        maxIterations,
      });
      if (iterEval.done) {
        done = true;
        lastReasoning = iterEval.reasoning?.trim() || 'Goal achieved according to per-iteration evaluator.';
        if (typeof config.log === 'function') {
          config.log(`AI inject: evaluator reports done on iteration ${iterationsRun}`, {
            reasoning: lastReasoning,
            url: activeUrl,
          });
        }
        const record: PlaywrightInjectionIterationRecord = {
          iteration: iterationsRun,
          code: '',
          done: true,
          reasoning: lastReasoning,
          executionError: null,
          urlAfter: activeUrl,
          screenshotArtifactName: iterScreenshotArtifactName,
          htmlArtifactName: iterHtmlArtifactName,
          evaluation: { done: true, context: '', reasoning: lastReasoning },
        };
        iterationRecords.push(record);
        if (typeof config.onIterationResult === 'function') config.onIterationResult(record);
        break;
      }
      iterationFreshContext = iterEval.context;
      iterationEvalRecord = { done: false, context: iterEval.context };
    }

    const isContinuation = useHistory && conversationHistory.length > 0;

    const result = await injectCodeWithAI({
      goal,
      systemPrompt: config.systemPrompt ?? null,
      context: {
        iteration: iterationsRun,
        maxIterations,
        url: activeUrl,
        dom,
        screenshotBase64,
        priorEvaluation: isContinuation ? null : evaluatorContext,
        priorInjectorReasoning: isContinuation ? null : priorInjectorReasoning,
        freshEvaluation: iterationFreshContext,
        priorExecutionError,
        isContinuation,
      },
      conversationHistory: useHistory ? conversationHistory : null,
    });

    modelId = result.modelId;
    lastReasoning = result.reasoning;
    done = result.done;
    priorInjectorReasoning = result.reasoning;
    priorExecutionError = null;

    if (useHistory) {
      conversationHistory.push({ role: 'user', content: result.userMessageText });
      conversationHistory.push({ role: 'assistant', content: result.rawText });
    }

    if (typeof config.log === 'function') {
      config.log(`AI inject iteration ${iterationsRun}/${maxIterations}`, {
        done: result.done,
        reasoning: result.reasoning,
        url: activeUrl,
      });
    }

    const normalizedCode = result.code.trim();
    if (normalizedCode && seenCodes.has(normalizedCode)) {
      lastReasoning = `Duplicate code detected on iteration ${iterationsRun} — aborting to prevent infinite loop.`;
      done = false;
      const record: PlaywrightInjectionIterationRecord = {
        iteration: iterationsRun,
        code: result.code,
        done: false,
        reasoning: lastReasoning,
        executionError: null,
        urlAfter: activeUrl,
        screenshotArtifactName: iterScreenshotArtifactName,
        htmlArtifactName: iterHtmlArtifactName,
        evaluation: iterationEvalRecord,
      };
      iterationRecords.push(record);
      if (typeof config.onIterationResult === 'function') config.onIterationResult(record);
      if (typeof config.log === 'function') {
        config.log(`AI inject duplicate code on iteration ${iterationsRun} — aborting`, {
          url: activeUrl,
        });
      }
      break;
    }
    if (normalizedCode) seenCodes.add(normalizedCode);

    let executionError: string | null = null;

    if (result.code) {
      const urlBeforeExec = activeUrl;
      try {
        await executeInjectedPlaywrightCode(page, result.code);
      } catch (err) {
        executionError =
          err instanceof Error ? err.message : String(err ?? 'Unknown error');
        priorExecutionError = executionError;
        lastReasoning = `Code execution failed on iteration ${iterationsRun}: ${executionError}`;
        done = false;
        if (typeof config.log === 'function') {
          config.log(`AI inject execution error on iteration ${iterationsRun}`, {
            error: executionError,
          });
        }
      }

      try {
        activeUrl = page.url();
      } catch {
        // page may still be navigating
      }

      if (!done && iterationsRun < maxIterations) {
        if (shouldWaitForNavigation && activeUrl !== urlBeforeExec) {
          await page
            .waitForLoadState('domcontentloaded', { timeout: 5000 })
            .catch(() => undefined);
        } else {
          await page.waitForTimeout(500).catch(() => undefined);
        }
        try {
          activeUrl = page.url();
        } catch {
          // still navigating
        }
      }
    }

    if (executionError !== null) {
      consecutiveErrors++;
    } else {
      consecutiveErrors = 0;
    }

    const record: PlaywrightInjectionIterationRecord = {
      iteration: iterationsRun,
      code: result.code,
      done: result.done && executionError === null,
      reasoning: lastReasoning ?? result.reasoning,
      executionError,
      urlAfter: activeUrl,
      screenshotArtifactName: iterScreenshotArtifactName,
      htmlArtifactName: iterHtmlArtifactName,
      evaluation: iterationEvalRecord,
    };
    iterationRecords.push(record);
    if (typeof config.onIterationResult === 'function') config.onIterationResult(record);

    if (maxConsecErrors !== null && consecutiveErrors >= maxConsecErrors) {
      lastReasoning = `Injection loop aborted after ${consecutiveErrors} consecutive execution error${consecutiveErrors === 1 ? '' : 's'}.`;
      if (typeof config.log === 'function') {
        config.log(lastReasoning, { iterationsRun, consecutiveErrors });
      }
      break;
    }
  }

  return {
    attempted: true,
    iterationsRun,
    done,
    lastReasoning,
    modelId,
    finalUrl: activeUrl,
    iterations: iterationRecords,
    conversationHistory,
  };
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

  if (options.injectOnEvaluation?.shouldInject(review, capture)) {
    const effectiveInjectConfig: typeof options.injectOnEvaluation = {
      ...options.injectOnEvaluation,
      log: options.injectOnEvaluation.log ?? options.log ?? undefined,
      artifacts: options.injectOnEvaluation.artifacts ?? options.artifacts ?? undefined,
      artifactKey: options.injectOnEvaluation.artifactKey ?? options.artifactKey ?? undefined,
    };
    injection = await runPlaywrightVerificationInjectionLoop(
      options.page,
      effectiveInjectConfig,
      review,
      capture
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
      let postHtmlArtifactName: string | null = null;
      const postInjectKey = `${options.artifactKey}-post-inject`;
      try {
        postScreenshotBuffer = await options.page.screenshot({ type: 'png' });
        if (typeof options.artifacts?.file === 'function') {
          const artifactPath = await options.artifacts.file(
            postInjectKey,
            postScreenshotBuffer,
            { extension: 'png', mimeType: 'image/png', kind: options.screenshotKind?.trim() || 'screenshot' }
          );
          postScreenshotArtifactName = toArtifactName(artifactPath);
        }
      } catch {
        // proceed without screenshot
      }
      if (typeof options.artifacts?.html === 'function') {
        const htmlArtifact = await options.artifacts.html(postInjectKey).catch(() => null);
        postHtmlArtifactName = toArtifactName(htmlArtifact);
      }

      capture = {
        currentUrl: postUrl,
        pageTitle: postTitle,
        pageTextSnippet: postTextSnippet,
        screenshotBase64: postScreenshotBuffer?.toString('base64') ?? null,
        screenshotArtifactName: postScreenshotArtifactName,
        htmlArtifactName: postHtmlArtifactName,
        fingerprint: postFingerprint,
        observedAt: new Date().toISOString(),
      };
      review = await options.evaluate(capture);
      injectionReEvaluated = true;
    }

    if (typeof options.artifacts?.json === 'function' && injection.iterations.length > 0) {
      await options.artifacts
        .json(`${options.artifactKey}-inject-history`, injection.iterations)
        .catch(() => undefined);
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
  artifacts?: PlaywrightObservationArtifacts;
  log?: ((message: string, context?: unknown) => void) | null | undefined;
  screenshotFailureLogKey?: string | null | undefined;
  evaluate: (
    capture: PlaywrightCapturedPageObservation,
    params: TParams
  ) => Promise<TReview>;
  commitObservation: (input: {
    review: TReview;
    observation: TObservation;
    injection: PlaywrightInjectionAttemptResult | null;
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
      injectOnEvaluation: options.injectOnEvaluation
        ? {
            ...options.injectOnEvaluation,
            log: options.injectOnEvaluation.log ?? options.log ?? undefined,
            artifacts: options.injectOnEvaluation.artifacts ?? options.artifacts ?? undefined,
            artifactKey: options.injectOnEvaluation.artifactKey ?? options.artifactKey ?? undefined,
          }
        : null,
    });

  if (deduped) {
    return observation;
  }

  const nextReview = review!;
  const observations = await options.commitObservation({
    review: nextReview,
    observation,
    injection,
  });

  const baseDetails = buildPlaywrightVerificationReviewDetailsFromProfile(observation, options.profile);
  const injectionDetails: Array<{ label: string; value?: string | null }> = injection
    ? (() => {
        const errorCount = injection.iterations.filter((r) => r.executionError !== null).length;
        return [
          { label: 'AI inject iterations', value: String(injection.iterationsRun) },
          { label: 'AI inject done', value: String(injection.done) },
          ...(errorCount > 0
            ? [{ label: 'AI inject exec errors', value: String(errorCount) }]
            : []),
          { label: 'AI inject model', value: injection.modelId },
          { label: 'AI inject reasoning', value: injection.lastReasoning },
          { label: 'AI inject final URL', value: injection.finalUrl },
        ];
      })()
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
  artifacts?: PlaywrightObservationArtifacts;
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
  /** Error thrown by the previous iteration's generated code; triggers rule 10 in the system prompt */
  priorExecutionError?: string | null | undefined;
  /**
   * When true the user message is a short "continuation" format — omits goal, evaluation context,
   * and prior reasoning since they already live in the conversation history.
   */
  isContinuation?: boolean | null | undefined;
  /**
   * Fresh per-iteration evaluation context produced by an inline evaluator. Unlike
   * `priorEvaluation` this is always included in the user message — even on continuation
   * turns — because it reflects the current page state, not a pre-loop snapshot.
   */
  freshEvaluation?: string | null | undefined;
};

/** A single turn in the injector's multi-turn conversation history */
export type PlaywrightInjectionConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type PlaywrightStepInjectOptions = {
  goal: string;
  systemPrompt?: string | null | undefined;
  context: PlaywrightStepInjectContext;
  /** Prior turns to prepend before the current user message, enabling multi-turn code generation */
  conversationHistory?: readonly PlaywrightInjectionConversationMessage[] | null | undefined;
};

export type PlaywrightStepInjectResult = {
  code: string;
  done: boolean;
  reasoning: string;
  modelId: string;
  /** The raw text returned by the AI — store as assistant turn in conversation history */
  rawText: string;
  /** The text-only user message that was sent — store as user turn in conversation history */
  userMessageText: string;
};

const buildInjectorUserMessage = (options: PlaywrightStepInjectOptions): string => {
  const { goal, context } = options;
  const isContinuation = context.isContinuation === true;

  const lines: string[] = isContinuation
    ? [
        `Continuation — iteration ${context.iteration} of ${context.maxIterations}`,
        `Current URL: ${context.url}`,
      ]
    : [
        `Goal: ${goal}`,
        `Iteration: ${context.iteration} of ${context.maxIterations}`,
        `Current URL: ${context.url}`,
      ];

  if (!isContinuation && context.priorEvaluation) {
    lines.push(`\nPrior AI Evaluator output:\n${context.priorEvaluation}`);
  }

  if (!isContinuation && context.priorInjectorReasoning) {
    lines.push(`\nPrior injector reasoning:\n${context.priorInjectorReasoning}`);
  }

  if (context.freshEvaluation) {
    lines.push(`\nCurrent page evaluation:\n${context.freshEvaluation}`);
  }

  if (context.priorExecutionError) {
    lines.push(`\nPrior execution error:\n${context.priorExecutionError}`);
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
      rawText: text,
    };
  } catch {
    return {
      code: cleaned,
      done: true,
      reasoning: 'Direct code response (JSON parse failed).',
      modelId,
      rawText: text,
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

  const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
    options.conversationHistory?.map((m) => ({ role: m.role, content: m.content })) ?? [];

  const result = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: userContent as string },
    ],
    temperature: brainConfig.temperature ?? 0.2,
  });

  return { ...parseInjectorResponse(result.text, result.modelId), userMessageText: userMessage };
}

/**
 * Per-iteration page snapshot provided to the vision-guided evaluator.
 * Captured fresh at the start of every loop iteration.
 */
export type PlaywrightVisionIterationCapture = {
  screenshotBase64: string | null;
  dom: string | null;
  url: string | null;
  iteration: number;
  maxIterations: number;
};

/**
 * Result returned by the vision-guided evaluator for a single iteration.
 * `done: true` exits the loop without generating code; `context` feeds the code generator.
 */
export type PlaywrightVisionIterationEvaluation = {
  /** Serialized description of the current page state for the code generator */
  context: string;
  /** When true the goal is already satisfied — skip code generation and exit */
  done: boolean;
  /** Human-readable explanation of the evaluation outcome (logged when done=true) */
  reasoning?: string | null | undefined;
};

/**
 * Options for building a vision-guided evaluator from a structured AI screenshot evaluation.
 * Pass the result of `createPlaywrightVisionGuidedEvaluator` as the `evaluate` option of
 * `runPlaywrightVisionGuidedAutomation` or as `evaluateCapture` in
 * `PlaywrightVerificationInjectionConfig`.
 */
export type PlaywrightVisionGuidedEvaluatorOptions<TParsed> = {
  /** Zod schema for the AI's structured screenshot evaluation response */
  schema: z.ZodType<TParsed>;
  /** System prompt for the screenshot evaluator AI model */
  systemPrompt: string;
  /**
   * Returns true when the parsed page state satisfies the goal.
   * Receives null when the AI evaluation failed or produced an unparseable response.
   * When true, the automation loop exits without generating or executing code.
   */
  isDone: (parsed: TParsed | null, capture: PlaywrightVisionIterationCapture) => boolean;
  /**
   * Serializes the parsed evaluation result into a context string for the code generator.
   * Only called when `isDone` returns false.
   * Receives null when the AI evaluation failed — build a minimal fallback context in that case.
   */
  buildContext: (parsed: TParsed | null, capture: PlaywrightVisionIterationCapture) => string;
  /**
   * Extracts a human-readable reasoning string from the parsed result.
   * Used as `reasoning` in the iteration record when `isDone` returns true.
   */
  getReasoning?: ((parsed: TParsed | null) => string | null | undefined) | null | undefined;
};

export type PlaywrightVisionGuidedAutomationOptions = {
  page: Page;
  /** Natural-language goal describing what the automation should achieve */
  goal: string;
  /**
   * Per-iteration evaluator — called after every fresh capture.
   * Returns structured context for the code generator and a done flag.
   * When `done` is true the loop exits without generating or executing code.
   * Use `createPlaywrightVisionGuidedEvaluator` to build this from a Zod schema.
   */
  evaluate: (capture: PlaywrightVisionIterationCapture) => Promise<PlaywrightVisionIterationEvaluation>;
  /** Maximum code-generation+execution iterations (default: 3) */
  maxIterations?: number | null | undefined;
  /**
   * Maximum wall-clock milliseconds the loop may run before aborting.
   * No timeout when omitted.
   */
  timeoutMs?: number | null | undefined;
  /** Optional system prompt override for the code generator */
  systemPrompt?: string | null | undefined;
  /**
   * When true (default), waits for domcontentloaded after navigation-triggering code.
   * Set to false to use only the fixed inter-iteration delay.
   */
  waitForNavigation?: boolean | null | undefined;
  /**
   * When true (default), maintains a multi-turn conversation across iterations so the
   * code generator can reference its exact prior outputs.
   */
  useConversationHistory?: boolean | null | undefined;
  /** Optional status callback — one message per iteration */
  log?: ((message: string, context?: unknown) => void) | null | undefined;
  /** Optional structured callback — one record per iteration with full details */
  onIterationResult?: ((record: PlaywrightInjectionIterationRecord) => void) | null | undefined;
  /**
   * Artifact key prefix used when saving the iteration history JSON.
   * Required when `artifacts` is provided; no artifacts are saved when omitted.
   */
  artifactKey?: string | null | undefined;
  /**
   * Artifact callbacks for persisting loop outputs.
   * When provided and `artifactKey` is set, the full iteration history is saved
   * as a JSON artifact after the loop completes.
   */
  artifacts?: PlaywrightObservationArtifacts | null | undefined;
  /**
   * Abort the loop after this many consecutive code-execution errors.
   * Resets to 0 after any successful execution. No limit when omitted.
   */
  maxConsecutiveErrors?: number | null | undefined;
};

/**
 * Seamless vision-guided automation loop: every iteration captures a fresh screenshot and
 * DOM, evaluates the current page state with the caller-provided `evaluate` function, and
 * (when the evaluator says the goal is not yet met) generates and executes targeted
 * Playwright code. Continues until the evaluator reports done, the code generator reports
 * done, `maxIterations` is reached, or `timeoutMs` elapses.
 */
export async function runPlaywrightVisionGuidedAutomation(
  options: PlaywrightVisionGuidedAutomationOptions
): Promise<PlaywrightInjectionAttemptResult> {
  const maxIterations =
    typeof options.maxIterations === 'number' &&
    Number.isFinite(options.maxIterations) &&
    options.maxIterations > 0
      ? Math.trunc(options.maxIterations)
      : 3;
  const shouldWaitForNavigation = options.waitForNavigation !== false;
  const useHistory = options.useConversationHistory !== false;
  const loopTimeoutMs =
    typeof options.timeoutMs === 'number' &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : null;
  const loopStartedAt = loopTimeoutMs !== null ? Date.now() : 0;

  const maxConsecErrors =
    typeof options.maxConsecutiveErrors === 'number' &&
    Number.isFinite(options.maxConsecutiveErrors) &&
    options.maxConsecutiveErrors > 0
      ? options.maxConsecutiveErrors
      : null;
  let consecutiveErrors = 0;
  let iterationsRun = 0;
  let done = false;
  let lastReasoning: string | null = null;
  let modelId: string | null = null;
  let priorExecutionError: string | null = null;
  let activeUrl = safePageUrl(options.page) ?? '';
  const iterationRecords: PlaywrightInjectionIterationRecord[] = [];
  const seenCodes = new Set<string>();
  const conversationHistory: PlaywrightInjectionConversationMessage[] = [];

  while (iterationsRun < maxIterations && !done) {
    if (loopTimeoutMs !== null && Date.now() - loopStartedAt >= loopTimeoutMs) {
      lastReasoning = `Vision-guided automation timed out after ${loopTimeoutMs}ms.`;
      if (typeof options.log === 'function') {
        options.log(`Vision automation timed out after ${loopTimeoutMs}ms`, { iterationsRun });
      }
      break;
    }
    iterationsRun++;

    // Step 1: Capture fresh page state
    const [dom, screenshotBuffer] = await Promise.all([
      options.page.content().catch(() => null),
      options.page.screenshot({ type: 'png' }).catch(() => null),
    ]);
    const screenshotBase64 = screenshotBuffer?.toString('base64') ?? null;
    try {
      activeUrl = options.page.url();
    } catch {
      // page may be navigating
    }

    let iterScreenshotArtifactName: string | null = null;
    let iterHtmlArtifactName: string | null = null;
    if (options.artifactKey) {
      const iterKey = `${options.artifactKey}-iter-${iterationsRun}`;
      if (screenshotBuffer && typeof options.artifacts?.file === 'function') {
        try {
          const artifactPath = await options.artifacts.file(iterKey, screenshotBuffer, {
            extension: 'png',
            mimeType: 'image/png',
            kind: 'screenshot',
          });
          iterScreenshotArtifactName = toArtifactName(artifactPath);
        } catch {
          // proceed without saving artifact
        }
      }
      if (typeof options.artifacts?.html === 'function') {
        iterHtmlArtifactName = toArtifactName(await options.artifacts.html(iterKey).catch(() => null));
      }
    }

    // Step 2: Evaluate current page state
    const evaluation = await options.evaluate({
      screenshotBase64,
      dom,
      url: activeUrl,
      iteration: iterationsRun,
      maxIterations,
    });

    if (evaluation.done) {
      done = true;
      lastReasoning = evaluation.reasoning?.trim() || 'Goal achieved according to evaluator.';
      if (typeof options.log === 'function') {
        options.log(`Vision automation: evaluator reports done on iteration ${iterationsRun}`, {
          reasoning: lastReasoning,
          url: activeUrl,
        });
      }
      const record: PlaywrightInjectionIterationRecord = {
        iteration: iterationsRun,
        code: '',
        done: true,
        reasoning: lastReasoning,
        executionError: null,
        urlAfter: activeUrl,
        screenshotArtifactName: iterScreenshotArtifactName,
        htmlArtifactName: iterHtmlArtifactName,
        evaluation: { done: true, context: evaluation.context, reasoning: evaluation.reasoning },
      };
      iterationRecords.push(record);
      if (typeof options.onIterationResult === 'function') options.onIterationResult(record);
      break;
    }

    // Step 3: Prepare code — inject fresh evaluation context into every turn
    const isContinuation = useHistory && conversationHistory.length > 0;
    const result = await injectCodeWithAI({
      goal: options.goal,
      systemPrompt: options.systemPrompt ?? null,
      context: {
        iteration: iterationsRun,
        maxIterations,
        url: activeUrl,
        dom,
        screenshotBase64,
        freshEvaluation: evaluation.context,
        priorExecutionError,
        isContinuation,
      },
      conversationHistory: useHistory ? conversationHistory : null,
    });

    modelId = result.modelId;
    lastReasoning = result.reasoning;
    done = result.done;
    priorExecutionError = null;

    if (useHistory) {
      conversationHistory.push({ role: 'user', content: result.userMessageText });
      conversationHistory.push({ role: 'assistant', content: result.rawText });
    }

    if (typeof options.log === 'function') {
      options.log(`Vision automation iteration ${iterationsRun}/${maxIterations}`, {
        done: result.done,
        reasoning: result.reasoning,
        url: activeUrl,
      });
    }

    const normalizedCode = result.code.trim();
    if (normalizedCode && seenCodes.has(normalizedCode)) {
      lastReasoning = `Duplicate code detected on iteration ${iterationsRun} — aborting.`;
      done = false;
      const record: PlaywrightInjectionIterationRecord = {
        iteration: iterationsRun,
        code: result.code,
        done: false,
        reasoning: lastReasoning,
        executionError: null,
        urlAfter: activeUrl,
        screenshotArtifactName: iterScreenshotArtifactName,
        htmlArtifactName: iterHtmlArtifactName,
        evaluation: { done: false, context: evaluation.context, reasoning: evaluation.reasoning },
      };
      iterationRecords.push(record);
      if (typeof options.onIterationResult === 'function') options.onIterationResult(record);
      if (typeof options.log === 'function') {
        options.log(`Vision automation duplicate code on iteration ${iterationsRun} — aborting`, { url: activeUrl });
      }
      break;
    }
    if (normalizedCode) seenCodes.add(normalizedCode);

    // Step 4: Execute
    let executionError: string | null = null;
    if (result.code) {
      const urlBeforeExec = activeUrl;
      try {
        await executeInjectedPlaywrightCode(options.page, result.code);
      } catch (err) {
        executionError = err instanceof Error ? err.message : String(err ?? 'Unknown error');
        priorExecutionError = executionError;
        lastReasoning = `Code execution failed on iteration ${iterationsRun}: ${executionError}`;
        done = false;
        if (typeof options.log === 'function') {
          options.log(`Vision automation execution error on iteration ${iterationsRun}`, { error: executionError });
        }
      }

      try {
        activeUrl = options.page.url();
      } catch {
        // still navigating
      }

      if (!done && iterationsRun < maxIterations) {
        if (shouldWaitForNavigation && activeUrl !== urlBeforeExec) {
          await options.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => undefined);
        } else {
          await options.page.waitForTimeout(500).catch(() => undefined);
        }
        try {
          activeUrl = options.page.url();
        } catch {
          // still navigating
        }
      }
    }

    if (executionError !== null) {
      consecutiveErrors++;
    } else {
      consecutiveErrors = 0;
    }

    const record: PlaywrightInjectionIterationRecord = {
      iteration: iterationsRun,
      code: result.code,
      done: result.done,
      reasoning: result.reasoning,
      executionError,
      urlAfter: activeUrl,
      screenshotArtifactName: iterScreenshotArtifactName,
      htmlArtifactName: iterHtmlArtifactName,
      evaluation: { done: false, context: evaluation.context, reasoning: evaluation.reasoning },
    };
    iterationRecords.push(record);
    if (typeof options.onIterationResult === 'function') options.onIterationResult(record);

    if (maxConsecErrors !== null && consecutiveErrors >= maxConsecErrors) {
      lastReasoning = `Vision automation aborted after ${consecutiveErrors} consecutive execution error${consecutiveErrors === 1 ? '' : 's'}.`;
      if (typeof options.log === 'function') {
        options.log(lastReasoning, { iterationsRun, consecutiveErrors });
      }
      break;
    }
  }

  const result: PlaywrightInjectionAttemptResult = {
    attempted: true,
    iterationsRun,
    done,
    lastReasoning,
    modelId,
    finalUrl: activeUrl,
    iterations: iterationRecords,
    conversationHistory,
  };

  if (
    typeof options.artifacts?.json === 'function' &&
    options.artifactKey &&
    iterationRecords.length > 0
  ) {
    await options.artifacts
      .json(`${options.artifactKey}-vision-history`, iterationRecords)
      .catch(() => undefined);
  }

  return result;
}

/**
 * Builds a per-iteration evaluator function from a Zod schema and AI system prompt.
 * The returned function can be passed directly to `runPlaywrightVisionGuidedAutomation`
 * as `evaluate`, or to `PlaywrightVerificationInjectionConfig` as `evaluateCapture`.
 *
 * Each call runs `evaluateStructuredPlaywrightScreenshotWithAI` against the current
 * screenshot, parses the AI response through the schema, then delegates to `isDone`
 * and `buildContext` to produce a `PlaywrightVisionIterationEvaluation`.
 */
export function createPlaywrightVisionGuidedEvaluator<TParsed>(
  options: PlaywrightVisionGuidedEvaluatorOptions<TParsed>
): (capture: PlaywrightVisionIterationCapture) => Promise<PlaywrightVisionIterationEvaluation> {
  return async (capture: PlaywrightVisionIterationCapture): Promise<PlaywrightVisionIterationEvaluation> => {
    const evalResult = await evaluateStructuredPlaywrightScreenshotWithAI({
      screenshotBase64: capture.screenshotBase64,
      systemPrompt: options.systemPrompt,
      responseSchema: options.schema,
    });

    const parsed = evalResult.parsed;
    const isDone = options.isDone(parsed, capture);

    if (isDone) {
      const reasoning =
        typeof options.getReasoning === 'function'
          ? (options.getReasoning(parsed) ?? 'Goal achieved.')
          : 'Goal achieved.';
      return { context: '', done: true, reasoning };
    }

    return {
      context: options.buildContext(parsed, capture),
      done: false,
    };
  };
}
