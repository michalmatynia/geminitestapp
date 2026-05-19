import { z } from 'zod';

const trimmedString = z.string().trim();
const optionalTrimmedText = (max: number): z.ZodDefault<z.ZodString> =>
  trimmedString.max(max).default('');
const nullableTrimmedText = (
  max: number
): z.ZodDefault<z.ZodNullable<z.ZodString>> =>
  trimmedString.max(max).nullable().default(null);

export const SOCIAL_ARTICLE_SOURCE_PRESETS_COLLECTION = 'social_article_source_presets';
export const SOCIAL_ARTICLE_PROMPT_PRESETS_COLLECTION = 'social_article_prompt_presets';
export const SOCIAL_ARTICLE_SCRAPE_RUNS_COLLECTION = 'social_article_scrape_runs';
export const SOCIAL_ARTICLES_COLLECTION = 'social_articles';

export const socialArticleScrapeRunStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
]);
export type SocialArticleScrapeRunStatus = z.infer<
  typeof socialArticleScrapeRunStatusSchema
>;

export const socialArticleSourcePresetScripterModeSchema = z.enum([
  'assist',
  'replace',
]);
export type SocialArticleSourcePresetScripterMode = z.infer<
  typeof socialArticleSourcePresetScripterModeSchema
>;

export const socialArticleSourcePresetSchema = z.object({
  id: trimmedString.min(1).max(160),
  name: trimmedString.min(1).max(160),
  urls: z.array(trimmedString.min(1).max(1000)).min(1).max(40),
  enabled: z.boolean().default(true),
  obeyRobotsTxt: z.boolean().default(true),
  maxArticlesPerSource: z.number().int().min(1).max(50).default(10),
  crawlDepth: z.number().int().min(0).max(2).default(1),
  includePatterns: z.array(trimmedString.max(240)).max(20).default([]),
  excludePatterns: z.array(trimmedString.max(240)).max(20).default([]),
  playwrightScripterId: trimmedString.max(160).nullable().default(null),
  playwrightScripterMode: socialArticleSourcePresetScripterModeSchema.default('assist'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type SocialArticleSourcePreset = z.infer<
  typeof socialArticleSourcePresetSchema
>;

export const socialArticlePromptPresetSchema = z.object({
  id: trimmedString.min(1).max(160),
  name: trimmedString.min(1).max(160),
  prompt: trimmedString.min(1).max(12000),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type SocialArticlePromptPreset = z.infer<typeof socialArticlePromptPresetSchema>;

export const socialArticleRecordSchema = z.object({
  id: trimmedString.min(1).max(160),
  author: nullableTrimmedText(240),
  bodyText: optionalTrimmedText(100000),
  canonicalUrl: nullableTrimmedText(1000),
  description: nullableTrimmedText(2000),
  excerpt: nullableTrimmedText(4000),
  imageUrl: nullableTrimmedText(1000),
  lastScrapeRunId: trimmedString.max(160).nullable().default(null),
  publishedAt: nullableTrimmedText(80),
  rawMetadata: z.record(z.string(), z.unknown()).default({}),
  resolvedUrl: trimmedString.url().max(1000),
  scrapeCount: z.number().int().min(1).default(1),
  scrapedAt: z.string().datetime(),
  sourcePresetId: trimmedString.max(160).nullable().default(null),
  sourceUrl: trimmedString.url().max(1000),
  title: optionalTrimmedText(500),
  wordCount: z.number().int().min(0).default(0),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type SocialArticleRecord = z.infer<typeof socialArticleRecordSchema>;

export const scrapedSocialArticleSchema = socialArticleRecordSchema
  .omit({
    createdAt: true,
    id: true,
    lastScrapeRunId: true,
    scrapeCount: true,
    scrapedAt: true,
    updatedAt: true,
  })
  .extend({
    rawMetadata: z.record(z.string(), z.unknown()).default({}),
    sourcePresetId: trimmedString.max(160).nullable().default(null),
  });
export type ScrapedSocialArticle = z.infer<typeof scrapedSocialArticleSchema>;

export const socialArticleScripterDiagnosticSchema = z.object({
  articleCount: z.number().int().min(0).default(0),
  candidateCount: z.number().int().min(0).default(0),
  errors: z.array(trimmedString.max(1000)).max(100).default([]),
  mode: socialArticleSourcePresetScripterModeSchema.default('assist'),
  rawRecordCount: z.number().int().min(0).default(0),
  scripterId: trimmedString.max(160).nullable().default(null),
  sourcePresetId: trimmedString.max(160).nullable().default(null),
  sourceUrl: trimmedString.url().max(1000),
  telemetry: z
    .array(
      z.object({
        durationMs: z.number().int().min(0).default(0),
        error: trimmedString.max(1000).nullable().default(null),
        kind: trimmedString.max(120),
        recordsAdded: z.number().int().min(0).default(0),
        stepId: trimmedString.max(160),
      })
    )
    .max(500)
    .default([]),
  visitedUrls: z.array(trimmedString.max(1000)).max(500).default([]),
  warnings: z.array(trimmedString.max(1000)).max(100).default([]),
});
export type SocialArticleScripterDiagnostic = z.infer<
  typeof socialArticleScripterDiagnosticSchema
>;

export const socialArticleScrapeRunSchema = z.object({
  id: trimmedString.min(1).max(160),
  articleIds: z.array(trimmedString.max(160)).max(1000).default([]),
  customUrls: z.array(trimmedString.min(1).max(1000)).max(80).default([]),
  error: trimmedString.max(4000).nullable().default(null),
  finishedAt: z.string().datetime().nullable().default(null),
  maxArticlesPerSource: z.number().int().min(1).max(50).default(10),
  message: optionalTrimmedText(1000),
  obeyRobotsTxt: z.boolean().default(true),
  playwrightRunId: trimmedString.max(160).nullable().default(null),
  playwrightScripterIds: z.array(trimmedString.max(160)).max(80).default([]),
  scripterDiagnostics: z.array(socialArticleScripterDiagnosticSchema).max(500).default([]),
  sourcePresetIds: z.array(trimmedString.max(160)).max(80).default([]),
  startedAt: z.string().datetime(),
  status: socialArticleScrapeRunStatusSchema.default('pending'),
  totalArticleCount: z.number().int().min(0).default(0),
  visitedUrls: z.array(trimmedString.max(1000)).max(2000).default([]),
  warnings: z.array(trimmedString.max(1000)).max(500).default([]),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type SocialArticleScrapeRun = z.infer<typeof socialArticleScrapeRunSchema>;

export const socialArticleAggregatorStoreSchema = z.object({
  version: z.number().int().positive().default(1),
  articles: z.array(socialArticleRecordSchema).default([]),
  promptPresets: z.array(socialArticlePromptPresetSchema).max(500).default([]),
  scrapeRuns: z.array(socialArticleScrapeRunSchema).max(1000).default([]),
  sourcePresets: z.array(socialArticleSourcePresetSchema).max(500).default([]),
});
export type SocialArticleAggregatorStore = z.infer<
  typeof socialArticleAggregatorStoreSchema
>;

export const socialArticleScrapeRequestSchema = z.object({
  customUrls: z.array(trimmedString.url().max(1000)).max(80).default([]),
  maxArticlesPerSource: z.number().int().min(1).max(50).default(10),
  obeyRobotsTxt: z.boolean().default(true),
  sourcePresetIds: z.array(trimmedString.max(160)).max(80).default([]),
});
export type SocialArticleScrapeRequest = z.infer<typeof socialArticleScrapeRequestSchema>;

export const socialArticleScrapeResponseSchema = z.object({
  articles: z.array(socialArticleRecordSchema),
  run: socialArticleScrapeRunSchema,
});
export type SocialArticleScrapeResponse = z.infer<
  typeof socialArticleScrapeResponseSchema
>;

export const socialArticleAggregationContextArticleSchema = z.object({
  author: nullableTrimmedText(240),
  bodyText: optionalTrimmedText(20000),
  canonicalUrl: nullableTrimmedText(1000),
  description: nullableTrimmedText(2000),
  excerpt: nullableTrimmedText(4000),
  id: trimmedString.min(1).max(160),
  publishedAt: nullableTrimmedText(80),
  resolvedUrl: trimmedString.url().max(1000),
  sourceUrl: trimmedString.url().max(1000),
  title: optionalTrimmedText(500),
});
export type SocialArticleAggregationContextArticle = z.infer<
  typeof socialArticleAggregationContextArticleSchema
>;

export const buildSocialArticleAggregationContextArticle = (
  article: SocialArticleRecord
): SocialArticleAggregationContextArticle =>
  socialArticleAggregationContextArticleSchema.parse({
    author: article.author,
    bodyText: article.bodyText.slice(0, 20000),
    canonicalUrl: article.canonicalUrl,
    description: article.description,
    excerpt: article.excerpt,
    id: article.id,
    publishedAt: article.publishedAt,
    resolvedUrl: article.resolvedUrl,
    sourceUrl: article.sourceUrl,
    title: article.title,
  });

export const parseSocialArticleAggregatorStore = (
  value: unknown
): SocialArticleAggregatorStore => socialArticleAggregatorStoreSchema.parse(value ?? {});
