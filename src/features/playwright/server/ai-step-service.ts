import 'server-only';

import type { Page } from 'playwright';

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
8. Read runtime['aiEvaluatorOutput'] to access the last AI Evaluator analysis.`;

export type PlaywrightStepEvaluateOptions = {
  inputSource: 'screenshot' | 'html' | 'text_content' | 'selector_text';
  data: string;
  systemPrompt?: string | null | undefined;
};

export type PlaywrightStepEvaluateResult = {
  output: string;
  modelId: string;
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
};

export type CaptureAndEvaluatePlaywrightObservationResult<TReview, TObservation> = {
  observation: TObservation;
  review: TReview | null;
  capture: PlaywrightCapturedPageObservation;
  deduped: boolean;
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

export const buildPlaywrightObservationFingerprint = (
  parts: readonly unknown[]
): string =>
  parts
    .map((part) => {
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
    })
    .join('::');

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

  const capture: PlaywrightCapturedPageObservation = {
    ...baseCapture,
    screenshotBase64: screenshotBuffer?.toString('base64') ?? null,
    screenshotArtifactName,
    htmlArtifactName,
  };
  const review = await options.evaluate(capture);

  return {
    observation: options.buildObservation({ capture, review }),
    review,
    capture,
    deduped: false,
  };
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

  const result = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: brainConfig.temperature ?? 0.2,
  });

  return parseInjectorResponse(result.text, result.modelId);
}
