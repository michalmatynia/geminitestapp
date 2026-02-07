import { z } from 'zod';

import { parseJsonSetting } from '@/shared/utils/settings-json';

export const AI_BRAIN_SETTINGS_KEY = 'ai_brain_settings';
export const AI_BRAIN_PROVIDER_CATALOG_KEY = 'ai_brain_provider_catalog';

export type AiBrainProvider = 'model' | 'agent';
export type AiBrainFeature =
  | 'cms_builder'
  | 'system_logs'
  | 'error_logs'
  | 'analytics'
  | 'runtime_analytics'
  | 'image_studio'
  | 'ai_paths'
  | 'prompt_engine';

export type AiBrainAssignment = {
  enabled: boolean;
  provider: AiBrainProvider;
  modelId: string;
  agentId: string;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  notes?: string | null | undefined;
};

export type AiBrainSettings = {
  defaults: AiBrainAssignment;
  assignments: Partial<Record<AiBrainFeature, AiBrainAssignment>>;
};

export type AiBrainProviderCatalog = {
  modelPresets: string[];
  paidModels: string[];
  ollamaModels: string[];
  agentModels: string[];
  deepthinkingAgents: string[];
  playwrightPersonas: string[];
};

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

const assignmentSchema = z.object({
  enabled: z.boolean().default(true),
  provider: z.enum(['model', 'agent']).default('model'),
  modelId: z.string().trim().default(''),
  agentId: z.string().trim().default(''),
  temperature: numberField(0, 2),
  maxTokens: numberField(1, 8192),
  notes: z.string().trim().nullable().optional().default(null),
});

const settingsSchema = z.object({
  defaults: assignmentSchema,
  assignments: z
    .object({
      cms_builder: assignmentSchema.optional(),
      system_logs: assignmentSchema.optional(),
      error_logs: assignmentSchema.optional(),
      analytics: assignmentSchema.optional(),
      runtime_analytics: assignmentSchema.optional(),
      image_studio: assignmentSchema.optional(),
      ai_paths: assignmentSchema.optional(),
      prompt_engine: assignmentSchema.optional(),
    })
    .default({}),
});

const providerListSchema = z.array(z.string().trim().min(1)).default([]);

const providerCatalogSchema = z.object({
  modelPresets: providerListSchema,
  paidModels: providerListSchema,
  ollamaModels: providerListSchema,
  agentModels: providerListSchema,
  deepthinkingAgents: providerListSchema,
  playwrightPersonas: providerListSchema,
});

export const defaultBrainAssignment: AiBrainAssignment = {
  enabled: true,
  provider: 'model',
  modelId: '',
  agentId: '',
  temperature: 0.2,
  maxTokens: 1200,
  notes: null,
};

export const defaultBrainSettings: AiBrainSettings = {
  defaults: { ...defaultBrainAssignment },
  assignments: {},
};

export const defaultBrainProviderCatalog: AiBrainProviderCatalog = {
  modelPresets: [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4.1-mini',
    'gpt-4.1',
    'o1-mini',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  paidModels: [],
  ollamaModels: [],
  agentModels: [],
  deepthinkingAgents: [],
  playwrightPersonas: [],
};

const sanitizeProviderList = (values: string[]): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  values.forEach((value: string) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    next.push(trimmed);
  });
  return next;
};

export const parseBrainSettings = (raw: string | null | undefined): AiBrainSettings => {
  const parsed = parseJsonSetting<unknown>(raw, null);
  const result = settingsSchema.safeParse(parsed ?? defaultBrainSettings);
  if (!result.success) return defaultBrainSettings;
  return result.data as AiBrainSettings;
};

export const parseBrainProviderCatalog = (
  raw: string | null | undefined
): AiBrainProviderCatalog => {
  const parsed = parseJsonSetting<unknown>(raw, null);
  const result = providerCatalogSchema.safeParse(parsed ?? defaultBrainProviderCatalog);
  if (!result.success) return defaultBrainProviderCatalog;
  return {
    modelPresets: sanitizeProviderList(result.data.modelPresets),
    paidModels: sanitizeProviderList(result.data.paidModels),
    ollamaModels: sanitizeProviderList(result.data.ollamaModels),
    agentModels: sanitizeProviderList(result.data.agentModels),
    deepthinkingAgents: sanitizeProviderList(result.data.deepthinkingAgents),
    playwrightPersonas: sanitizeProviderList(result.data.playwrightPersonas),
  };
};

export const resolveBrainAssignment = (
  settings: AiBrainSettings,
  feature: AiBrainFeature
): AiBrainAssignment => {
  const override = settings.assignments?.[feature];
  if (!override) return { ...settings.defaults };
  return {
    ...settings.defaults,
    ...override,
  };
};

export const sanitizeBrainAssignment = (
  assignment: AiBrainAssignment
): AiBrainAssignment => ({
  ...assignment,
  modelId: assignment.modelId?.trim() ?? '',
  agentId: assignment.agentId?.trim() ?? '',
  notes: assignment.notes?.trim() || null,
});

export const sanitizeBrainProviderCatalog = (
  catalog: AiBrainProviderCatalog
): AiBrainProviderCatalog => ({
  modelPresets: sanitizeProviderList(catalog.modelPresets),
  paidModels: sanitizeProviderList(catalog.paidModels),
  ollamaModels: sanitizeProviderList(catalog.ollamaModels),
  agentModels: sanitizeProviderList(catalog.agentModels),
  deepthinkingAgents: sanitizeProviderList(catalog.deepthinkingAgents),
  playwrightPersonas: sanitizeProviderList(catalog.playwrightPersonas),
});
