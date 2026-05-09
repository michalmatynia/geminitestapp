import 'server-only';

import type { z } from 'zod';

import {
  createPlaywrightVisionGuidedEvaluator,
  evaluateStructuredPlaywrightScreenshotWithAI,
  type PlaywrightVerificationInjectionConfig,
} from '@/features/playwright/server/ai-step-service';

import {
  PRODUCT_SCAN_VERIFICATION_REVIEW_SYSTEM_PROMPT,
  productScanVerificationReviewResponseSchema,
} from './product-scan-ai-evaluator.schema';
import { readOptionalString } from './product-scan-ai-evaluator.utils';
import type { ProductScanVerificationBarrierEvaluationInput } from './product-scan-verification.capture';
import type { ProductScanVerificationReview } from './product-scan-verification.core';

type VerificationReviewParsed = z.infer<typeof productScanVerificationReviewResponseSchema>;
type CapturedVerificationContext = {
  currentUrl?: string | null;
  pageTextSnippet?: string | null;
  url?: string | null;
};

const resolveProviderPrefix = (provider: string | null | undefined): string => {
  const label = readOptionalString(provider);
  return label !== null ? `${label} ` : '';
};

const appendOptionalLine = (
  lines: string[],
  label: string,
  value: string | null | undefined
): void => {
  const normalized = readOptionalString(value);
  if (normalized !== null) lines.push(`${label}: ${normalized}`);
};

const buildIterationEvaluatorContext = (
  parsed: VerificationReviewParsed | null,
  capture: CapturedVerificationContext
): string => {
  if (parsed === null) {
    return `URL: ${capture.url ?? 'unknown'}. Per-iteration evaluation failed; proceeding with prior context.`;
  }
  const lines = [
    `Challenge type: ${parsed.challengeType ?? 'unknown'}`,
    `Manual action required: ${String(parsed.manualActionRequired ?? 'unknown')}`,
    `URL: ${capture.url ?? 'unknown'}`,
  ];
  appendOptionalLine(lines, 'Visible question', parsed.visibleQuestion);
  if (parsed.uiElements.length > 0) lines.push(`UI elements: ${parsed.uiElements.join(', ')}`);
  if (parsed.visibleInstructions.length > 0) {
    lines.push(`Instructions: ${parsed.visibleInstructions.join('; ')}`);
  }
  return lines.join('\n');
};

const buildAutoInjectionGoal = (
  review: ProductScanVerificationReview,
  capture: CapturedVerificationContext,
  providerLabel: string
): string => {
  const parts = [`Solve the ${providerLabel}verification challenge visible on the page.`];
  appendOptionalSentence(parts, 'Current URL', capture.currentUrl);
  appendOptionalSentence(parts, 'Challenge type', review.challengeType);
  appendOptionalSentence(parts, 'Visible question', review.visibleQuestion);
  return parts.join(' ');
};

const appendOptionalSentence = (
  parts: string[],
  label: string,
  value: string | null | undefined
): void => {
  const normalized = readOptionalString(value);
  if (normalized !== null) parts.push(`${label}: ${normalized}.`);
};

const buildAutoEvaluatorContext = (
  review: ProductScanVerificationReview,
  capture: CapturedVerificationContext
): string => {
  const lines = buildCommonEvaluatorContextLines(review, capture, null);
  appendOptionalLine(lines, 'Visible question', review.visibleQuestion);
  if (review.visibleInstructions.length > 0) {
    lines.push(`Instructions: ${review.visibleInstructions.join('; ')}`);
  }
  if (review.uiElements.length > 0) lines.push(`UI elements: ${review.uiElements.join(', ')}`);
  appendOptionalLine(lines, 'Page summary', review.pageSummary);
  appendOptionalLine(lines, 'Page text', capture.pageTextSnippet?.slice(0, 500));
  return lines.join('\n');
};

const buildCommonEvaluatorContextLines = (
  review: ProductScanVerificationReview,
  capture: CapturedVerificationContext,
  handlingMode: string | null
): string[] => {
  const lines = [
    `Provider: ${review.provider}`,
    `Stage: ${review.stage}`,
    `Current URL: ${capture.currentUrl ?? 'unknown'}`,
    `Challenge type: ${review.challengeType ?? 'unknown'}`,
  ];
  if (handlingMode !== null) lines.push(`Handling mode: ${handlingMode}`);
  return lines;
};

export const createProductScanVerificationBarrierAutoInjectionConfig = (options?: {
  provider?: string;
  maxIterations?: number;
}): PlaywrightVerificationInjectionConfig<ProductScanVerificationReview> => {
  const providerLabel = resolveProviderPrefix(options?.provider);
  return {
    shouldInject: (review) =>
      review.status === 'analyzed' && review.manualActionRequired === true,
    goal: (review, capture) => buildAutoInjectionGoal(review, capture, providerLabel),
    buildEvaluatorContext: buildAutoEvaluatorContext,
    maxIterations: options?.maxIterations ?? 3,
    reEvaluateAfterInjection: true,
    evaluateCapture: createPlaywrightVisionGuidedEvaluator({
      schema: productScanVerificationReviewResponseSchema,
      systemPrompt: PRODUCT_SCAN_VERIFICATION_REVIEW_SYSTEM_PROMPT,
      isDone: (parsed) => parsed !== null && parsed.manualActionRequired === false,
      buildContext: buildIterationEvaluatorContext,
      getReasoning: (parsed) => parsed?.pageSummary ?? 'Verification challenge resolved.',
    }),
  };
};

export const createProductScanVerificationBarrierManualOnlyInjectionConfig = (options?: {
  provider?: string;
}): PlaywrightVerificationInjectionConfig<ProductScanVerificationReview> => {
  const providerLabel = resolveProviderPrefix(options?.provider);
  return {
    shouldInject: () => false,
    goal: (review, capture) => {
      const parts = [
        `Keep the ${providerLabel}verification review manual-only.`,
        'Do not interact with the challenge UI.',
      ];
      appendOptionalSentence(parts, 'Current URL', capture.currentUrl);
      appendOptionalSentence(parts, 'Challenge type', review.challengeType);
      return parts.join(' ');
    },
    buildEvaluatorContext: (review, capture) => {
      const lines = buildCommonEvaluatorContextLines(review, capture, 'manual-only');
      appendOptionalLine(lines, 'Visible question', review.visibleQuestion);
      if (review.visibleInstructions.length > 0) {
        lines.push(`Instructions: ${review.visibleInstructions.join('; ')}`);
      }
      appendOptionalLine(lines, 'Page summary', review.pageSummary);
      return lines.join('\n');
    },
    maxIterations: 0,
    reEvaluateAfterInjection: false,
    waitForNavigation: false,
    useConversationHistory: false,
  };
};

const createVerificationBarrierBaseReview = (
  input: ProductScanVerificationBarrierEvaluationInput
): ProductScanVerificationReview => ({
  status: input.screenshotBase64 !== null ? 'capture_only' : 'failed',
  provider: input.provider,
  stage: input.stage,
  currentUrl: input.currentUrl,
  pageTitle: input.pageTitle,
  pageTextSnippet: input.pageTextSnippet,
  challengeType: null,
  visibleQuestion: null,
  visibleInstructions: [],
  uiElements: [],
  pageSummary:
    input.screenshotBase64 !== null
      ? 'Verification barrier captured for manual review.'
      : 'Verification barrier could not be captured.',
  manualActionRequired: true,
  confidence: null,
  screenshotArtifactName: readOptionalString(input.screenshotArtifactName),
  htmlArtifactName: readOptionalString(input.htmlArtifactName),
  modelId: null,
  brainApplied: null,
  error: input.screenshotBase64 !== null ? null : 'Screenshot capture failed.',
  evaluatedAt: null,
});

const buildVerificationReviewPromptPayload = (
  input: ProductScanVerificationBarrierEvaluationInput
): Record<string, unknown> => ({
  objective:
    readOptionalString(input.objective) ??
    'Describe the visible verification barrier for manual handling only. Do not solve it.',
  provider: input.provider,
  currentUrl: input.currentUrl,
  pageTitle: input.pageTitle,
  visibleTextSnippet: input.pageTextSnippet,
  returnShape: {
    challengeType: 'string | null',
    visibleQuestion: 'string | null',
    visibleInstructions: 'string[]',
    uiElements: 'string[]',
    pageSummary: 'string | null',
    manualActionRequired: 'boolean | null',
    confidence: 'number | null',
  },
});

const createAnalyzedVerificationReview = (input: {
  baseReview: ProductScanVerificationReview;
  parsed: VerificationReviewParsed;
  modelId: string | null;
}): ProductScanVerificationReview => ({
  ...input.baseReview,
  status: 'analyzed',
  challengeType: input.parsed.challengeType,
  visibleQuestion: input.parsed.visibleQuestion,
  visibleInstructions: input.parsed.visibleInstructions,
  uiElements: input.parsed.uiElements,
  pageSummary: input.parsed.pageSummary,
  manualActionRequired: input.parsed.manualActionRequired,
  confidence: input.parsed.confidence,
  modelId: input.modelId,
  brainApplied: {
    capability: 'playwright.ai_evaluator_step',
    runtimeKind: 'vision',
    systemPromptApplied: true,
  },
  error: null,
  evaluatedAt: new Date().toISOString(),
});

export const evaluateProductScanVerificationBarrier = async (
  input: ProductScanVerificationBarrierEvaluationInput
): Promise<ProductScanVerificationReview> => {
  const baseReview = createVerificationBarrierBaseReview(input);
  if (input.screenshotBase64 === null) return baseReview;

  try {
    const completion = await evaluateStructuredPlaywrightScreenshotWithAI({
      screenshotBase64: input.screenshotBase64,
      systemPrompt: PRODUCT_SCAN_VERIFICATION_REVIEW_SYSTEM_PROMPT,
      promptPayload: buildVerificationReviewPromptPayload(input),
      responseSchema: productScanVerificationReviewResponseSchema,
    });
    if (completion.parsed === null) {
      // LLM failed to return a valid structured response for screenshot evaluation
      throw new Error(completion.error ?? 'Structured screenshot evaluation failed.');
    }
    return createAnalyzedVerificationReview({
      baseReview,
      parsed: completion.parsed,
      modelId: completion.modelId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    return { ...baseReview, status: 'capture_only', error: message };
  }
};
