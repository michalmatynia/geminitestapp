/**
 * AI Step Injection Service
 * 
 * Provides services for orchestrating complex AI-driven injection and 
 * verification loops in Playwright scenarios.
 */

import { type PlaywrightCapturedPageObservation, type PlaywrightInjectionIterationRecord, type PlaywrightVisionIterationCapture, type PlaywrightVisionIterationEvaluation } from '@/features/playwright/server/ai-step-service/types';

/**
 * Configuration for Playwright verification and injection loops.
 */
export type PlaywrightVerificationInjectionConfig<TReview> = {
  shouldInject: (review: TReview, capture: PlaywrightCapturedPageObservation) => boolean;
  goal: string | ((review: TReview, capture: PlaywrightCapturedPageObservation) => string);
  systemPrompt?: string | null | undefined;
  maxIterations?: number | null | undefined;
  buildEvaluatorContext?: ((review: TReview, capture: PlaywrightCapturedPageObservation) => string) | null | undefined;
  reEvaluateAfterInjection?: boolean | null | undefined;
  log?: ((message: string, context?: unknown) => void) | null | undefined;
  onIterationResult?: ((record: PlaywrightInjectionIterationRecord) => void) | null | undefined;
  waitForNavigation?: boolean | null | undefined;
  timeoutMs?: number | null | undefined;
  useConversationHistory?: boolean | null | undefined;
  evaluateCapture?: ((capture: PlaywrightVisionIterationCapture) => Promise<PlaywrightVisionIterationEvaluation>) | null | undefined;
  artifacts?: import('@/features/playwright/server/ai-step-service/types').PlaywrightObservationArtifacts | null | undefined;
  artifactKey?: string | null | undefined;
  maxConsecutiveErrors?: number | null | undefined;
  iterationDelayMs?: number | null | undefined;
};
