import type { z } from 'zod';
import type { AiBrainCapabilityKey } from '@/shared/contracts/ai-brain';

export type PlaywrightStepEvaluateOptions = {
  inputSource: 'screenshot' | 'html' | 'text_content' | 'selector_text';
  data: string;
  systemPrompt?: string | null | undefined;
  capability?: AiBrainCapabilityKey | null | undefined;
  defaultModelId?: string | null | undefined;
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
  capability?: AiBrainCapabilityKey | null | undefined;
  defaultModelId?: string | null | undefined;
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

export type PlaywrightInjectionIterationEvaluationRecord = {
  done: boolean;
  context: string;
  reasoning?: string | null | undefined;
};

export type PlaywrightInjectionIterationRecord = {
  iteration: number;
  code: string;
  done: boolean;
  reasoning: string;
  executionError: string | null;
  urlAfter: string | null;
  screenshotArtifactName: string | null;
  htmlArtifactName: string | null;
  evaluation: PlaywrightInjectionIterationEvaluationRecord | null;
};

export type PlaywrightVisionIterationCapture = {
  screenshotBase64: string | null;
  dom: string | null;
  url: string | null;
  iteration: number;
  maxIterations: number;
};

export type PlaywrightVisionIterationEvaluation = {
  context: string;
  done: boolean;
  reasoning?: string | null | undefined;
};

export type PlaywrightVerificationInjectionConfig<TReview> = {
  shouldInject: (review: TReview, capture: PlaywrightCapturedPageObservation) => boolean;
  goal: string | ((review: TReview, capture: PlaywrightCapturedPageObservation) => string);
  systemPrompt?: string | null | undefined;
  maxIterations?: number | null | undefined;
  buildEvaluatorContext?: ((
    review: TReview,
    capture: PlaywrightCapturedPageObservation
  ) => string) | null | undefined;
  reEvaluateAfterInjection?: boolean | null | undefined;
  log?: ((message: string, context?: unknown) => void) | null | undefined;
  onIterationResult?: ((record: PlaywrightInjectionIterationRecord) => void) | null | undefined;
  waitForNavigation?: boolean | null | undefined;
  timeoutMs?: number | null | undefined;
  useConversationHistory?: boolean | null | undefined;
  evaluateCapture?: ((
    capture: PlaywrightVisionIterationCapture
  ) => Promise<PlaywrightVisionIterationEvaluation>) | null | undefined;
  artifacts?: PlaywrightObservationArtifacts | null | undefined;
  artifactKey?: string | null | undefined;
  maxConsecutiveErrors?: number | null | undefined;
  iterationDelayMs?: number | null | undefined;
  capability?: AiBrainCapabilityKey | null | undefined;
  defaultModelId?: string | null | undefined;
};

export type PlaywrightInjectionConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type PlaywrightInjectionResult = {
  code: string;
  done: boolean;
  reasoning: string;
  modelId: string;
  rawText: string;
  userMessageText: string;
};
