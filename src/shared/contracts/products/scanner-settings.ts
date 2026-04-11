import { z } from 'zod';

import { playwrightSettingsSchema } from '../playwright';

export const productScannerPlaywrightBrowserSchema = z.enum([
  'auto',
  'brave',
  'chrome',
  'chromium',
]);

export type ProductScannerPlaywrightBrowser = z.infer<
  typeof productScannerPlaywrightBrowserSchema
>;

export const productScannerCaptchaBehaviorSchema = z.enum([
  'auto_show_browser',
  'fail',
]);

export type ProductScannerCaptchaBehavior = z.infer<
  typeof productScannerCaptchaBehaviorSchema
>;

export const productScannerAmazonCandidateEvaluatorModeSchema = z.enum([
  'disabled',
  'brain_default',
  'model_override',
]);

export type ProductScannerAmazonCandidateEvaluatorMode = z.infer<
  typeof productScannerAmazonCandidateEvaluatorModeSchema
>;

export const productScannerAmazonCandidateEvaluatorSchema = z.object({
  mode: productScannerAmazonCandidateEvaluatorModeSchema,
  modelId: z.string().trim().min(1).max(200).nullable(),
  threshold: z.number().min(0).max(1),
  onlyForAmbiguousCandidates: z.boolean(),
  systemPrompt: z.string().trim().max(4000).nullable(),
});

export type ProductScannerAmazonCandidateEvaluator = z.infer<
  typeof productScannerAmazonCandidateEvaluatorSchema
>;

export const productScannerSettingsSchema = z.object({
  playwrightPersonaId: z.string().trim().min(1).max(200).nullable(),
  playwrightBrowser: productScannerPlaywrightBrowserSchema,
  captchaBehavior: productScannerCaptchaBehaviorSchema,
  manualVerificationTimeoutMs: z.number().int().positive().max(900_000),
  playwrightSettingsOverrides: playwrightSettingsSchema.partial(),
  amazonCandidateEvaluator: productScannerAmazonCandidateEvaluatorSchema.optional(),
});

export type ProductScannerSettings = z.infer<typeof productScannerSettingsSchema>;
