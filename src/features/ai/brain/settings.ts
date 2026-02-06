import { z } from 'zod';

import { parseJsonSetting } from '@/shared/utils/settings-json';

export const AI_BRAIN_SETTINGS_KEY = 'ai_brain_settings';

export type AiBrainProvider = 'model' | 'agent';
export type AiBrainFeature =
  | 'cms_builder'
  | 'system_logs'
  | 'error_logs'
  | 'analytics'
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
      image_studio: assignmentSchema.optional(),
      ai_paths: assignmentSchema.optional(),
      prompt_engine: assignmentSchema.optional(),
    })
    .default({}),
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

export const parseBrainSettings = (raw: string | null | undefined): AiBrainSettings => {
  const parsed = parseJsonSetting<unknown>(raw, null);
  const result = settingsSchema.safeParse(parsed ?? defaultBrainSettings);
  if (!result.success) return defaultBrainSettings;
  return result.data as AiBrainSettings;
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
