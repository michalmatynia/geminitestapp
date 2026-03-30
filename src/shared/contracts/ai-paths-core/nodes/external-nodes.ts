import { z } from 'zod';
import { playwrightSettingsSchema } from '../../playwright';

export const advancedApiMethodSchema = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

export type AdvancedApiMethodDto = z.infer<typeof advancedApiMethodSchema>;

export const advancedApiBodyModeSchema = z.enum(['none', 'json', 'text']);
export type AdvancedApiBodyModeDto = z.infer<typeof advancedApiBodyModeSchema>;

export const advancedApiResponseModeSchema = z.enum(['json', 'text', 'status']);
export type AdvancedApiResponseModeDto = z.infer<typeof advancedApiResponseModeSchema>;

export const advancedApiAuthModeSchema = z.enum([
  'none',
  'api_key',
  'bearer',
  'basic',
  'oauth2_client_credentials',
  'connection',
]);
export type AdvancedApiAuthModeDto = z.infer<typeof advancedApiAuthModeSchema>;

export const advancedApiApiKeyPlacementSchema = z.enum(['header', 'query']);
export type AdvancedApiApiKeyPlacementDto = z.infer<typeof advancedApiApiKeyPlacementSchema>;

export const advancedApiBackoffStrategySchema = z.enum(['fixed', 'exponential']);
export type AdvancedApiBackoffStrategyDto = z.infer<typeof advancedApiBackoffStrategySchema>;

export const advancedApiPaginationModeSchema = z.enum(['none', 'page', 'cursor', 'link']);
export type AdvancedApiPaginationModeDto = z.infer<typeof advancedApiPaginationModeSchema>;

export const advancedApiPaginationAggregateModeSchema = z.enum(['first_page', 'concat_items']);
export type AdvancedApiPaginationAggregateModeDto = z.infer<
  typeof advancedApiPaginationAggregateModeSchema
>;

export const advancedApiRateLimitOnLimitSchema = z.enum(['wait', 'fail']);
export type AdvancedApiRateLimitOnLimitDto = z.infer<typeof advancedApiRateLimitOnLimitSchema>;

export const advancedApiConfigSchema = z.object({
  url: z.string(),
  method: advancedApiMethodSchema,
  pathParamsJson: z.string().optional(),
  queryParamsJson: z.string().optional(),
  headersJson: z.string().optional(),
  bodyTemplate: z.string().optional(),
  bodyMode: advancedApiBodyModeSchema.optional(),
  timeoutMs: z.number().optional(),
  authMode: advancedApiAuthModeSchema.optional(),
  apiKeyName: z.string().optional(),
  apiKeyValueTemplate: z.string().optional(),
  apiKeyPlacement: advancedApiApiKeyPlacementSchema.optional(),
  bearerTokenTemplate: z.string().optional(),
  basicUsernameTemplate: z.string().optional(),
  basicPasswordTemplate: z.string().optional(),
  oauthTokenUrl: z.string().optional(),
  oauthClientIdTemplate: z.string().optional(),
  oauthClientSecretTemplate: z.string().optional(),
  oauthScopeTemplate: z.string().optional(),
  connectionIdTemplate: z.string().optional(),
  connectionHeaderName: z.string().optional(),
  responseMode: advancedApiResponseModeSchema.optional(),
  responsePath: z.string().optional(),
  outputMappingsJson: z.string().optional(),
  retryEnabled: z.boolean().optional(),
  retryAttempts: z.number().optional(),
  retryBackoff: advancedApiBackoffStrategySchema.optional(),
  retryBackoffMs: z.number().optional(),
  retryMaxBackoffMs: z.number().optional(),
  retryJitterRatio: z.number().optional(),
  retryOnStatusJson: z.string().optional(),
  retryOnNetworkError: z.boolean().optional(),
  paginationMode: advancedApiPaginationModeSchema.optional(),
  pageParam: z.string().optional(),
  limitParam: z.string().optional(),
  startPage: z.number().optional(),
  pageSize: z.number().optional(),
  cursorParam: z.string().optional(),
  cursorPath: z.string().optional(),
  itemsPath: z.string().optional(),
  maxPages: z.number().optional(),
  paginationAggregateMode: advancedApiPaginationAggregateModeSchema.optional(),
  rateLimitEnabled: z.boolean().optional(),
  rateLimitRequests: z.number().optional(),
  rateLimitIntervalMs: z.number().optional(),
  rateLimitConcurrency: z.number().optional(),
  rateLimitOnLimit: advancedApiRateLimitOnLimitSchema.optional(),
  idempotencyEnabled: z.boolean().optional(),
  idempotencyHeaderName: z.string().optional(),
  idempotencyKeyTemplate: z.string().optional(),
  errorRoutesJson: z.string().optional(),
});

export type AdvancedApiConfigDto = z.infer<typeof advancedApiConfigSchema>;
export type AdvancedApiConfig = AdvancedApiConfigDto;

export const playwrightBrowserEngineSchema = z.enum(['chromium', 'firefox', 'webkit']);
export type PlaywrightBrowserEngineDto = z.infer<typeof playwrightBrowserEngineSchema>;
export type PlaywrightBrowserEngine = PlaywrightBrowserEngineDto;

export const playwrightCaptureConfigSchema = z.object({
  screenshot: z.boolean().optional(),
  html: z.boolean().optional(),
  video: z.boolean().optional(),
  trace: z.boolean().optional(),
});
export type PlaywrightCaptureConfigDto = z.infer<typeof playwrightCaptureConfigSchema>;
export type PlaywrightCaptureConfig = PlaywrightCaptureConfigDto;

export const playwrightConfigSchema = z.object({
  personaId: z.string().optional(),
  script: z.string(),
  waitForResult: z.boolean().optional(),
  timeoutMs: z.number().optional(),
  browserEngine: playwrightBrowserEngineSchema.optional(),
  startUrlTemplate: z.string().optional(),
  launchOptionsJson: z.string().optional(),
  contextOptionsJson: z.string().optional(),
  settingsOverrides: playwrightSettingsSchema.partial().optional(),
  capture: playwrightCaptureConfigSchema.optional(),
});
export type PlaywrightConfigDto = z.infer<typeof playwrightConfigSchema>;
export type PlaywrightConfig = PlaywrightConfigDto;

export const httpConfigSchema = z.object({
  url: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.string(),
  bodyTemplate: z.string(),
  responseMode: z.enum(['json', 'text', 'status']),
  responsePath: z.string(),
});

export type HttpConfigDto = z.infer<typeof httpConfigSchema>;
export type HttpConfig = HttpConfigDto;
