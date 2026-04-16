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

export const productScannerAmazonImageSearchProviderSchema = z.enum([
  'google_images_upload',
  'google_images_url',
  'google_lens_upload',
]);

export type ProductScannerAmazonImageSearchProvider = z.infer<
  typeof productScannerAmazonImageSearchProviderSchema
>;

export const productScannerAmazonImageSearchFallbackProviderSchema =
  productScannerAmazonImageSearchProviderSchema.nullable();

export type ProductScannerAmazonImageSearchFallbackProvider = z.infer<
  typeof productScannerAmazonImageSearchFallbackProviderSchema
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

export const productScannerAmazonCandidateEvaluatorSimilarityModeSchema = z.enum([
  'deterministic_then_ai',
  'ai_only',
]);

export type ProductScannerAmazonCandidateEvaluatorSimilarityMode = z.infer<
  typeof productScannerAmazonCandidateEvaluatorSimilarityModeSchema
>;

export const productScannerAmazonCandidateEvaluatorAllowedContentLanguageSchema = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .toLowerCase()
  .regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/)
  .or(z.string().trim().min(2).max(20).transform((value) => value.toLowerCase().replace(/_/g, '-')));

export type ProductScannerAmazonCandidateEvaluatorAllowedContentLanguage = z.infer<
  typeof productScannerAmazonCandidateEvaluatorAllowedContentLanguageSchema
>;

export const productScannerAmazonCandidateEvaluatorSchema = z.object({
  mode: productScannerAmazonCandidateEvaluatorModeSchema,
  modelId: z.string().trim().min(1).max(200).nullable(),
  threshold: z.number().min(0).max(1),
  onlyForAmbiguousCandidates: z.boolean(),
  candidateSimilarityMode: productScannerAmazonCandidateEvaluatorSimilarityModeSchema,
  allowedContentLanguage: productScannerAmazonCandidateEvaluatorAllowedContentLanguageSchema,
  rejectNonEnglishContent: z.boolean(),
  languageDetectionMode: productScannerAmazonCandidateEvaluatorLanguageDetectionModeSchema,
  systemPrompt: z.string().trim().max(4000).nullable(),
});

export type ProductScannerAmazonCandidateEvaluator = z.infer<
  typeof productScannerAmazonCandidateEvaluatorSchema
>;

export const productScanner1688CandidateEvaluatorSchema = z.object({
  mode: productScannerAmazonCandidateEvaluatorModeSchema,
  modelId: z.string().trim().min(1).max(200).nullable(),
  threshold: z.number().min(0).max(1),
  onlyForAmbiguousCandidates: z.boolean(),
  systemPrompt: z.string().trim().max(4000).nullable(),
});

export type ProductScanner1688CandidateEvaluator = z.infer<
  typeof productScanner1688CandidateEvaluatorSchema
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
  amazonImageSearchProvider: productScannerAmazonImageSearchProviderSchema,
  amazonImageSearchFallbackProvider: productScannerAmazonImageSearchFallbackProviderSchema,
  playwrightSettingsOverrides: playwrightSettingsSchema.partial(),
  amazonCandidateEvaluator: productScannerAmazonCandidateEvaluatorSchema.optional(),
  amazonCandidateEvaluatorTriage: productScannerAmazonCandidateEvaluatorSchema.optional(),
  amazonCandidateEvaluatorProbe: productScannerAmazonCandidateEvaluatorSchema.optional(),
  amazonCandidateEvaluatorExtraction: productScannerAmazonCandidateEvaluatorSchema.optional(),
  scanner1688: productScanner1688SettingsSchema.optional(),
  scanner1688CandidateEvaluator: productScanner1688CandidateEvaluatorSchema.optional(),
});

export type ProductScannerSettings = z.infer<typeof productScannerSettingsSchema>;
