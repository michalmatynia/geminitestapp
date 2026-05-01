import type { Page } from 'playwright';
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
