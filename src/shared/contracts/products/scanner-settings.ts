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

export const productScannerAmazonCandidateEvaluatorLanguageDetectionModeSchema = z.enum([
  'deterministic_then_ai',
  'ai_only',
]);

export type ProductScannerAmazonCandidateEvaluatorLanguageDetectionMode = z.infer<
  typeof productScannerAmazonCandidateEvaluatorLanguageDetectionModeSchema
>;

export const productScannerAmazonCandidateEvaluatorAllowedContentLanguageSchema = z.enum(['en']);

export type ProductScannerAmazonCandidateEvaluatorAllowedContentLanguage = z.infer<
  typeof productScannerAmazonCandidateEvaluatorAllowedContentLanguageSchema
>;

export const productScannerAmazonCandidateEvaluatorSchema = z.object({
  mode: productScannerAmazonCandidateEvaluatorModeSchema,
  modelId: z.string().trim().min(1).max(200).nullable(),
  threshold: z.number().min(0).max(1),
  onlyForAmbiguousCandidates: z.boolean(),
  allowedContentLanguage: productScannerAmazonCandidateEvaluatorAllowedContentLanguageSchema,
  rejectNonEnglishContent: z.boolean(),
  languageDetectionMode: productScannerAmazonCandidateEvaluatorLanguageDetectionModeSchema,
  systemPrompt: z.string().trim().max(4000).nullable(),
});

export type ProductScannerAmazonCandidateEvaluator = z.infer<
  typeof productScannerAmazonCandidateEvaluatorSchema
>;

export const productScanner1688SettingsSchema = z.object({
  candidateResultLimit: z.number().int().min(1).max(20),
  minimumCandidateScore: z.number().int().min(1).max(20),
  maxExtractedImages: z.number().int().min(1).max(20),
  allowUrlImageSearchFallback: z.boolean(),
});

export type ProductScanner1688Settings = z.infer<typeof productScanner1688SettingsSchema>;

export const productScannerSettingsSchema = z.object({
  playwrightPersonaId: z.string().trim().min(1).max(200).nullable(),
  playwrightBrowser: productScannerPlaywrightBrowserSchema,
  captchaBehavior: productScannerCaptchaBehaviorSchema,
  manualVerificationTimeoutMs: z.number().int().positive().max(900_000),
  playwrightSettingsOverrides: playwrightSettingsSchema.partial(),
  amazonCandidateEvaluator: productScannerAmazonCandidateEvaluatorSchema.optional(),
  amazonCandidateEvaluatorProbe: productScannerAmazonCandidateEvaluatorSchema.optional(),
  amazonCandidateEvaluatorExtraction: productScannerAmazonCandidateEvaluatorSchema.optional(),
  scanner1688: productScanner1688SettingsSchema.optional(),
});

export type ProductScannerSettings = z.infer<typeof productScannerSettingsSchema>;
