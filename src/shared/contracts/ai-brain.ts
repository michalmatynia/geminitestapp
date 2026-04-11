import { z } from 'zod';

import { aiInsightRecordSchema } from './ai-insights';

/**
 * AI Brain DTOs
 */

export type BrainModelVendor = 'openai' | 'ollama' | 'anthropic' | 'gemini';

const numberField = (min: number, max: number): z.ZodType<number | undefined> =>
  z.preprocess((value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return value;
  }, z.number().min(min).max(max).optional());

export const aiBrainProviderSchema = z.enum(['model', 'agent']);
export type AiBrainProvider = z.infer<typeof aiBrainProviderSchema>;

export const aiBrainFeatureSchema = z.enum([
  'cms_builder',
  'system_logs',
  'error_logs',
  'analytics',
  'runtime_analytics',
  'image_studio',
  'ai_paths',
  'chatbot',
  'kangur_ai_tutor',
  'kangur_social',
  'products',
  'case_resolver',
  'agent_runtime',
  'agent_teaching',
  'prompt_engine',
]);
export type AiBrainFeature = z.infer<typeof aiBrainFeatureSchema>;

export const aiBrainCapabilityKeySchema = z.enum([
  'ai_paths.model',
  'chatbot.reply',
  'kangur_ai_tutor.chat',
  'kangur_ai_tutor.drawing_analysis',
  'kangur_social.post_generation',
  'kangur_social.visual_analysis',
  'kangur_social.doc_patching',
  'prompt_engine.prompt_exploder',
  'product.description.vision',
  'product.description.generation',
  'product.scan.amazon_candidate_match',
  'product.translation',
  'product.validation.runtime',
  'image_studio.general',
  'image_studio.prompt_extract',
  'image_studio.validation_pattern_learning',
  'image_studio.ui_extractor',
  'image_studio.mask_ai',
  'cms.css_stream',
  'case_resolver.ocr',
  'agent_runtime.default',
  'agent_runtime.memory_validation',
  'agent_runtime.planner',
  'agent_runtime.self_check',
  'agent_runtime.extraction_validation',
  'agent_runtime.tool_router',
  'agent_runtime.loop_guard',
  'agent_runtime.approval_gate',
  'agent_runtime.memory_summarization',
  'agent_runtime.selector_inference',
  'agent_runtime.output_normalization',
  'agent_teaching.chat',
  'agent_teaching.embeddings',
  'insights.analytics',
  'insights.runtime_analytics',
  'insights.system_logs',
  'insights.error_logs',
]);
export type AiBrainCapabilityKey = z.infer<typeof aiBrainCapabilityKeySchema>;

export const aiBrainAssignmentSchema = z
  .object({
    enabled: z.boolean().default(true),
    provider: aiBrainProviderSchema.default('model'),
    modelId: z.string().trim().default(''),
    agentId: z.string().trim().default(''),
    temperature: numberField(0, 2),
    maxTokens: numberField(1, 8192),
    systemPrompt: z.string().trim().optional(),
    notes: z.string().trim().nullable().optional().default(null),
  })
  .strict();

export type AiBrainAssignment = z.infer<typeof aiBrainAssignmentSchema>;

export const aiBrainSettingsSchema = z
  .object({
    defaults: aiBrainAssignmentSchema,
    assignments: z
      .record(aiBrainFeatureSchema, aiBrainAssignmentSchema.optional())
      .optional()
      .default({} as Record<AiBrainFeature, AiBrainAssignment>),
    capabilities: z
      .record(aiBrainCapabilityKeySchema, aiBrainAssignmentSchema.optional())
      .optional()
      .default({} as Record<AiBrainCapabilityKey, AiBrainAssignment>),
  })
  .strict();

export type AiBrainSettings = z.infer<typeof aiBrainSettingsSchema>;
export type UpdateAiBrainSettings = Partial<AiBrainSettings>;

export const aiBrainMemorySchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type AiBrainMemory = z.infer<typeof aiBrainMemorySchema>;
export type CreateAiBrainMemory = Omit<AiBrainMemory, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAiBrainMemory = Partial<CreateAiBrainMemory>;

export const aiBrainCatalogPoolSchema = z.enum([
  'modelPresets',
  'paidModels',
  'ollamaModels',
  'agentModels',
  'deepthinkingAgents',
  'playwrightPersonas',
]);
export type AiBrainCatalogPool = z.infer<typeof aiBrainCatalogPoolSchema>;

export const aiBrainCatalogEntrySchema = z
  .object({
    pool: aiBrainCatalogPoolSchema,
    value: z.string().trim().min(1),
  })
  .strict();
export type AiBrainCatalogEntry = z.infer<typeof aiBrainCatalogEntrySchema>;

export const aiBrainProviderCatalogSchema = z
  .object({
    entries: z.array(aiBrainCatalogEntrySchema).optional().default([]),
  })
  .strict();

export type AiBrainProviderCatalog = z.infer<typeof aiBrainProviderCatalogSchema>;

export const brainModelFamilySchema = z.enum([
  'chat',
  'embedding',
  'ocr',
  'vision_extract',
  'image_generation',
  'validation',
]);
export type BrainModelFamily = z.infer<typeof brainModelFamilySchema>;

export const brainModelModalitySchema = z.enum(['text', 'image', 'multimodal']);
export type BrainModelModality = z.infer<typeof brainModelModalitySchema>;

export const brainModelDescriptorSchema = z.object({
  id: z.string().trim().min(1),
  family: brainModelFamilySchema,
  modality: brainModelModalitySchema,
  vendor: z.enum(['openai', 'ollama', 'anthropic', 'gemini'] as [
    BrainModelVendor,
    ...BrainModelVendor[],
  ]),
  supportsStreaming: z.boolean().default(false),
  supportsJsonMode: z.boolean().default(false),
});

export type BrainModelDescriptor = z.infer<typeof brainModelDescriptorSchema>;

/**
 * AI Brain Query Response DTOs
 */

export const brainModelsResponseSchema = z.object({
  models: z.array(z.string()).default([]),
  descriptors: z.record(z.string(), brainModelDescriptorSchema).optional().default({}),
  warning: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
  sources: z
    .object({
      modelPresets: z.array(z.string()).default([]),
      paidModels: z.array(z.string()).default([]),
      configuredOllamaModels: z.array(z.string()).default([]),
      liveOllamaModels: z.array(z.string()).default([]),
    })
    .optional(),
});

export type BrainModelsResponse = z.infer<typeof brainModelsResponseSchema>;

export const brainOperationsRangeSchema = z.enum(['15m', '1h', '6h', '24h']);
export type BrainOperationsRange = z.infer<typeof brainOperationsRangeSchema>;

export const brainOperationsDomainStateSchema = z.enum([
  'healthy',
  'warning',
  'critical',
  'unknown',
]);
export type BrainOperationsDomainState = z.infer<typeof brainOperationsDomainStateSchema>;

export const brainOperationsDomainKeySchema = z.enum([
  'ai_paths',
  'chatbot',
  'agent_runtime',
  'image_studio',
]);
export type BrainOperationsDomainKey = z.infer<typeof brainOperationsDomainKeySchema>;

export const brainOperationsMetricSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
});
export type BrainOperationsMetric = z.infer<typeof brainOperationsMetricSchema>;

export const brainOperationsTrendDirectionSchema = z.enum(['up', 'down', 'flat', 'unknown']);
export type BrainOperationsTrendDirection = z.infer<typeof brainOperationsTrendDirectionSchema>;

export const brainOperationsTrendSchema = z.object({
  direction: brainOperationsTrendDirectionSchema,
  delta: z.number(),
  label: z.string().trim().min(1),
  current: z.number().int().nonnegative().optional(),
  previous: z.number().int().nonnegative().optional(),
});
export type BrainOperationsTrend = z.infer<typeof brainOperationsTrendSchema>;

export const brainOperationsLinkSchema = z.object({
  label: z.string().trim().min(1),
  href: z.string().trim().min(1),
});
export type BrainOperationsLink = z.infer<typeof brainOperationsLinkSchema>;

export const brainOperationsRecentEventSchema = z.object({
  id: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1),
  timestamp: z.string(),
});
export type BrainOperationsRecentEvent = z.infer<typeof brainOperationsRecentEventSchema>;

export const brainOperationsDomainOverviewSchema = z.object({
  key: brainOperationsDomainKeySchema,
  label: z.string().trim().min(1),
  state: brainOperationsDomainStateSchema,
  message: z.string().trim().min(1).optional(),
  sampleSize: z.number().int().nonnegative(),
  updatedAt: z.string(),
  metrics: z.array(brainOperationsMetricSchema).default([]),
  trend: brainOperationsTrendSchema.optional(),
  recentEvents: z.array(brainOperationsRecentEventSchema).default([]),
  links: z.array(brainOperationsLinkSchema).default([]),
});
export type BrainOperationsDomainOverview = z.infer<typeof brainOperationsDomainOverviewSchema>;

export const brainOperationsOverviewResponseSchema = z.object({
  range: brainOperationsRangeSchema.default('1h'),
  generatedAt: z.string(),
  window: z.object({
    currentStart: z.string(),
    currentEnd: z.string(),
    previousStart: z.string(),
    previousEnd: z.string(),
  }),
  domains: z.object({
    ai_paths: brainOperationsDomainOverviewSchema,
    chatbot: brainOperationsDomainOverviewSchema,
    agent_runtime: brainOperationsDomainOverviewSchema,
    image_studio: brainOperationsDomainOverviewSchema,
  }),
});
export type BrainOperationsOverviewResponse = z.infer<typeof brainOperationsOverviewResponseSchema>;

export const insightsSnapshotSchema = z.object({
  analytics: z.array(aiInsightRecordSchema).default([]),
  runtimeAnalytics: z.array(aiInsightRecordSchema).default([]),
  logs: z.array(aiInsightRecordSchema).default([]),
});

export type InsightsSnapshot = z.infer<typeof insightsSnapshotSchema>;

export const AI_BRAIN_SETTINGS_KEY = 'ai_brain_settings';
export const AI_BRAIN_PROVIDER_CATALOG_KEY = 'ai_brain_provider_catalog';

/**
 * Brain Execution DTOs
 */

export type BrainAppliedMeta = {
  capability: AiBrainCapabilityKey;
  feature: AiBrainFeature;
  modelFamily: BrainModelFamily;
  runtimeKind:
    | 'chat'
    | 'stream'
    | 'embedding'
    | 'ocr'
    | 'vision'
    | 'validation'
    | 'image_generation';
  provider: 'model' | 'agent';
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPromptApplied: boolean;
  modelSelectionSource?: 'node' | 'brain_default';
  defaultModelId?: string;
  enforced: true;
};

export type BrainExecutionConfig = {
  assignment: AiBrainAssignment;
  capability: AiBrainCapabilityKey;
  feature: AiBrainFeature;
  provider: 'model' | 'agent';
  agentId: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  brainApplied: BrainAppliedMeta;
};

export type AiPathsNodeExecutionInput = {
  requestedModelId?: string;
  requestedTemperature?: number;
  requestedMaxTokens?: number;
  requestedSystemPrompt?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  defaultSystemPrompt?: string;
  runtimeKind?: BrainAppliedMeta['runtimeKind'];
};
