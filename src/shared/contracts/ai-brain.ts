import { z } from 'zod';

import { aiInsightRecordSchema } from './ai-insights';

/**
 * AI Brain DTOs
 */

const numberField = (min: number, max: number): z.ZodType<number | undefined> =>
  z.preprocess(
    (value: unknown) => {
      if (value === '' || value === null || value === undefined) return undefined;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return value;
    },
    z.number().min(min).max(max).optional()
  );

export const aiBrainProviderSchema = z.enum(['model', 'agent']);
export type AiBrainProviderDto = z.infer<typeof aiBrainProviderSchema>;

export const aiBrainFeatureSchema = z.enum([
  'cms_builder',
  'system_logs',
  'error_logs',
  'analytics',
  'runtime_analytics',
  'image_studio',
  'ai_paths',
  'prompt_engine',
]);
export type AiBrainFeatureDto = z.infer<typeof aiBrainFeatureSchema>;

export const aiBrainAssignmentSchema = z.object({
  enabled: z.boolean().default(true),
  provider: aiBrainProviderSchema.default('model'),
  modelId: z.string().trim().default(''),
  agentId: z.string().trim().default(''),
  temperature: numberField(0, 2),
  maxTokens: numberField(1, 8192),
  notes: z.string().trim().nullable().optional().default(null),
});

export type AiBrainAssignmentDto = z.infer<typeof aiBrainAssignmentSchema>;

export const aiBrainSettingsSchema = z.object({
  defaults: aiBrainAssignmentSchema,
  assignments: z.record(aiBrainFeatureSchema, aiBrainAssignmentSchema.optional()).optional().default({} as Record<AiBrainFeatureDto, AiBrainAssignmentDto>),
});

export type AiBrainSettingsDto = z.infer<typeof aiBrainSettingsSchema>;
export type UpdateAiBrainSettingsDto = Partial<AiBrainSettingsDto>;

export const aiBrainMemorySchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type AiBrainMemoryDto = z.infer<typeof aiBrainMemorySchema>;
export type CreateAiBrainMemoryDto = Omit<AiBrainMemoryDto, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAiBrainMemoryDto = Partial<CreateAiBrainMemoryDto>;

const providerListSchema = z.array(z.string().trim().min(1)).default([]);

export const aiBrainProviderCatalogSchema = z.object({
  modelPresets: providerListSchema,
  paidModels: providerListSchema,
  ollamaModels: providerListSchema,
  agentModels: providerListSchema,
  deepthinkingAgents: providerListSchema,
  playwrightPersonas: providerListSchema,
});

export type AiBrainProviderCatalogDto = z.infer<typeof aiBrainProviderCatalogSchema>;

/**
 * AI Brain Query Response DTOs
 */

export const chatbotModelsResponseSchema = z.object({
  models: z.array(z.string()).optional(),
  warning: z.object({
    code: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
});

export type ChatbotModelsResponseDto = z.infer<typeof chatbotModelsResponseSchema>;

const insightsSnapshotSchema = z.object({
  analytics: z.array(aiInsightRecordSchema).default([]),
  logs: z.array(aiInsightRecordSchema).default([]),
});

export const InsightsSnapshotDtoSchema = insightsSnapshotSchema;

export type InsightsSnapshotDto = z.infer<typeof insightsSnapshotSchema>;

export const AI_BRAIN_SETTINGS_KEY = 'ai_brain_settings';
export const AI_BRAIN_PROVIDER_CATALOG_KEY = 'ai_brain_provider_catalog';
