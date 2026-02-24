import {
  type AiBrainProvider,
  type AiBrainFeature,
  type AiBrainAssignment,
  type AiBrainSettings,
  type AiBrainProviderCatalog,
  aiBrainSettingsSchema as settingsSchema,
  aiBrainProviderCatalogSchema as providerCatalogSchema,
  AI_BRAIN_SETTINGS_KEY as SETTINGS_KEY,
  AI_BRAIN_PROVIDER_CATALOG_KEY as CATALOG_KEY,
} from '@/shared/contracts/ai-brain';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export const AI_BRAIN_SETTINGS_KEY = SETTINGS_KEY;
export const AI_BRAIN_PROVIDER_CATALOG_KEY = CATALOG_KEY;

const BRAIN_FEATURE_KEYS: AiBrainFeature[] = [
  'image_studio',
  'analytics',
  'runtime_analytics',
  'cms_builder',
  'system_logs',
  'error_logs',
  'ai_paths',
  'prompt_engine',
];

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
  assignments: Object.fromEntries(
    BRAIN_FEATURE_KEYS.map((feature: AiBrainFeature): [AiBrainFeature, undefined] => [feature, undefined])
  ) as Record<AiBrainFeature, AiBrainAssignment | undefined>,
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
  return result.data;
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
