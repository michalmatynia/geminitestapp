import { z } from 'zod';

import { aiInsightRecordSchema } from './ai-insights';

/**
 * AI Brain DTOs
 */

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
  enabled: z.boolean(),
  provider: aiBrainProviderSchema,
  modelId: z.string(),
  agentId: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  notes: z.string().nullable().optional(),
});

export type AiBrainAssignmentDto = z.infer<typeof aiBrainAssignmentSchema>;

export const aiBrainSettingsSchema = z.object({
  defaults: aiBrainAssignmentSchema,
  assignments: z.record(aiBrainFeatureSchema, aiBrainAssignmentSchema).optional(),
});

export type AiBrainSettingsDto = z.infer<typeof aiBrainSettingsSchema>;

export const aiBrainProviderCatalogSchema = z.object({
  modelPresets: z.array(z.string()),
  paidModels: z.array(z.string()),
  ollamaModels: z.array(z.string()),
  agentModels: z.array(z.string()),
  deepthinkingAgents: z.array(z.string()),
  playwrightPersonas: z.array(z.string()),
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

export const insightsSnapshotSchema = z.object({
  analytics: z.array(aiInsightRecordSchema),
  logs: z.array(aiInsightRecordSchema),
});

export type InsightsSnapshotDto = z.infer<typeof insightsSnapshotSchema>;
