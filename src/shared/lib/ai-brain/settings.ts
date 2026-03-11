import {
  type AiBrainCatalogEntry,
  type AiBrainCatalogPool,
  type AiBrainProvider,
  type AiBrainFeature,
  type AiBrainCapabilityKey,
  type AiBrainAssignment,
  type AiBrainSettings,
  type AiBrainProviderCatalog,
  type BrainModelFamily,
  type BrainAppliedMeta,
  type BrainExecutionConfig,
  type AiPathsNodeExecutionInput,
  aiBrainSettingsSchema as settingsSchema,
  aiBrainProviderCatalogSchema as providerCatalogSchema,
  AI_BRAIN_SETTINGS_KEY as SETTINGS_KEY,
  AI_BRAIN_PROVIDER_CATALOG_KEY as CATALOG_KEY,
} from '@/shared/contracts/ai-brain';
import { validationError } from '@/shared/errors/app-error';
import { catalogToEntries, sanitizeCatalogEntries } from '@/shared/lib/ai-brain/catalog-entries';

export type {
  AiBrainCatalogEntry,
  AiBrainCatalogPool,
  AiBrainProvider,
  AiBrainFeature,
  AiBrainCapabilityKey,
  AiBrainAssignment,
  AiBrainSettings,
  AiBrainProviderCatalog,
  BrainModelFamily,
  BrainAppliedMeta,
  BrainExecutionConfig,
  AiPathsNodeExecutionInput,
};

export const AI_BRAIN_SETTINGS_KEY = SETTINGS_KEY;
export const AI_BRAIN_PROVIDER_CATALOG_KEY = CATALOG_KEY;

export const BRAIN_FEATURE_KEYS: AiBrainFeature[] = [
  'image_studio',
  'products',
  'case_resolver',
  'agent_runtime',
  'agent_teaching',
  'kangur_ai_tutor',
  'analytics',
  'runtime_analytics',
  'cms_builder',
  'system_logs',
  'error_logs',
  'ai_paths',
  'chatbot',
  'prompt_engine',
];

export type AiBrainCapabilityPolicy = 'model-only' | 'agent-or-model';

export type BrainCapabilityDefinition = {
  key: AiBrainCapabilityKey;
  feature: AiBrainFeature;
  label: string;
  policy: AiBrainCapabilityPolicy;
  modelFamily: BrainModelFamily;
};

const AI_PATHS_COMPATIBLE_MODEL_FAMILIES: readonly BrainModelFamily[] = [
  'chat',
  'validation',
  'vision_extract',
  'ocr',
];

export const BRAIN_CAPABILITY_REGISTRY: Record<AiBrainCapabilityKey, BrainCapabilityDefinition> = {
  'ai_paths.model': {
    key: 'ai_paths.model',
    feature: 'ai_paths',
    label: 'AI Paths Model',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'chatbot.reply': {
    key: 'chatbot.reply',
    feature: 'chatbot',
    label: 'Chatbot Reply',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'kangur_ai_tutor.chat': {
    key: 'kangur_ai_tutor.chat',
    feature: 'kangur_ai_tutor',
    label: 'StudiQ AI Tutor Chat',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'kangur_ai_tutor.drawing_analysis': {
    key: 'kangur_ai_tutor.drawing_analysis',
    feature: 'kangur_ai_tutor',
    label: 'StudiQ AI Tutor Drawing Analysis',
    policy: 'model-only',
    modelFamily: 'vision_extract',
  },
  'prompt_engine.prompt_exploder': {
    key: 'prompt_engine.prompt_exploder',
    feature: 'prompt_engine',
    label: 'Prompt Exploder AI',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'product.description.vision': {
    key: 'product.description.vision',
    feature: 'products',
    label: 'Product Description Vision',
    policy: 'model-only',
    modelFamily: 'vision_extract',
  },
  'product.description.generation': {
    key: 'product.description.generation',
    feature: 'products',
    label: 'Product Description Generation',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'product.translation': {
    key: 'product.translation',
    feature: 'products',
    label: 'Product Translation',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'product.validation.runtime': {
    key: 'product.validation.runtime',
    feature: 'products',
    label: 'Product Validation Runtime',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'image_studio.general': {
    key: 'image_studio.general',
    feature: 'image_studio',
    label: 'Image Studio Image Generation',
    policy: 'model-only',
    modelFamily: 'image_generation',
  },
  'image_studio.prompt_extract': {
    key: 'image_studio.prompt_extract',
    feature: 'image_studio',
    label: 'Image Studio Prompt Extract',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'image_studio.validation_pattern_learning': {
    key: 'image_studio.validation_pattern_learning',
    feature: 'image_studio',
    label: 'Image Studio Validation Pattern Learning',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'image_studio.ui_extractor': {
    key: 'image_studio.ui_extractor',
    feature: 'image_studio',
    label: 'Image Studio UI Extractor',
    policy: 'model-only',
    modelFamily: 'vision_extract',
  },
  'image_studio.mask_ai': {
    key: 'image_studio.mask_ai',
    feature: 'image_studio',
    label: 'Image Studio Mask AI',
    policy: 'model-only',
    modelFamily: 'vision_extract',
  },
  'cms.css_stream': {
    key: 'cms.css_stream',
    feature: 'cms_builder',
    label: 'CMS CSS Stream',
    policy: 'agent-or-model',
    modelFamily: 'chat',
  },
  'case_resolver.ocr': {
    key: 'case_resolver.ocr',
    feature: 'case_resolver',
    label: 'Case Resolver OCR',
    policy: 'model-only',
    modelFamily: 'ocr',
  },
  'agent_runtime.default': {
    key: 'agent_runtime.default',
    feature: 'agent_runtime',
    label: 'Agent Runtime Default',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'agent_runtime.memory_validation': {
    key: 'agent_runtime.memory_validation',
    feature: 'agent_runtime',
    label: 'Agent Runtime Memory Validation',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'agent_runtime.planner': {
    key: 'agent_runtime.planner',
    feature: 'agent_runtime',
    label: 'Agent Runtime Planner',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'agent_runtime.self_check': {
    key: 'agent_runtime.self_check',
    feature: 'agent_runtime',
    label: 'Agent Runtime Self Check',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'agent_runtime.extraction_validation': {
    key: 'agent_runtime.extraction_validation',
    feature: 'agent_runtime',
    label: 'Agent Runtime Extraction Validation',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'agent_runtime.tool_router': {
    key: 'agent_runtime.tool_router',
    feature: 'agent_runtime',
    label: 'Agent Runtime Tool Router',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'agent_runtime.loop_guard': {
    key: 'agent_runtime.loop_guard',
    feature: 'agent_runtime',
    label: 'Agent Runtime Loop Guard',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'agent_runtime.approval_gate': {
    key: 'agent_runtime.approval_gate',
    feature: 'agent_runtime',
    label: 'Agent Runtime Approval Gate',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'agent_runtime.memory_summarization': {
    key: 'agent_runtime.memory_summarization',
    feature: 'agent_runtime',
    label: 'Agent Runtime Memory Summarization',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'agent_runtime.selector_inference': {
    key: 'agent_runtime.selector_inference',
    feature: 'agent_runtime',
    label: 'Agent Runtime Selector Inference',
    policy: 'model-only',
    modelFamily: 'vision_extract',
  },
  'agent_runtime.output_normalization': {
    key: 'agent_runtime.output_normalization',
    feature: 'agent_runtime',
    label: 'Agent Runtime Output Normalization',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'agent_teaching.chat': {
    key: 'agent_teaching.chat',
    feature: 'agent_teaching',
    label: 'Agent Teaching Chat',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'agent_teaching.embeddings': {
    key: 'agent_teaching.embeddings',
    feature: 'agent_teaching',
    label: 'Agent Teaching Embeddings',
    policy: 'model-only',
    modelFamily: 'embedding',
  },
  'insights.analytics': {
    key: 'insights.analytics',
    feature: 'analytics',
    label: 'Insights Analytics',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'insights.runtime_analytics': {
    key: 'insights.runtime_analytics',
    feature: 'runtime_analytics',
    label: 'Insights Runtime Analytics',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'insights.system_logs': {
    key: 'insights.system_logs',
    feature: 'system_logs',
    label: 'Insights System Logs',
    policy: 'model-only',
    modelFamily: 'validation',
  },
  'insights.error_logs': {
    key: 'insights.error_logs',
    feature: 'error_logs',
    label: 'Insights Error Logs',
    policy: 'model-only',
    modelFamily: 'validation',
  },
};

export const BRAIN_CAPABILITY_KEYS = Object.keys(
  BRAIN_CAPABILITY_REGISTRY
) as AiBrainCapabilityKey[];

export const DEFAULT_BRAIN_CAPABILITY_BY_FEATURE: Record<AiBrainFeature, AiBrainCapabilityKey> = {
  cms_builder: 'cms.css_stream',
  system_logs: 'insights.system_logs',
  error_logs: 'insights.error_logs',
  analytics: 'insights.analytics',
  runtime_analytics: 'insights.runtime_analytics',
  image_studio: 'image_studio.general',
  ai_paths: 'ai_paths.model',
  chatbot: 'chatbot.reply',
  kangur_ai_tutor: 'kangur_ai_tutor.chat',
  products: 'product.description.generation',
  case_resolver: 'case_resolver.ocr',
  agent_runtime: 'agent_runtime.default',
  agent_teaching: 'agent_teaching.chat',
  prompt_engine: 'prompt_engine.prompt_exploder',
};

export const defaultBrainAssignment: AiBrainAssignment = {
  enabled: true,
  provider: 'model',
  modelId: '',
  agentId: '',
  temperature: 0.2,
  maxTokens: 1200,
  systemPrompt: '',
  notes: null,
};

export const defaultBrainSettings: AiBrainSettings = {
  defaults: { ...defaultBrainAssignment },
  assignments: Object.fromEntries(
    BRAIN_FEATURE_KEYS.map((feature: AiBrainFeature): [AiBrainFeature, undefined] => [
      feature,
      undefined,
    ])
  ) as Record<AiBrainFeature, AiBrainAssignment | undefined>,
  capabilities: Object.fromEntries(
    BRAIN_CAPABILITY_KEYS.map(
      (capability: AiBrainCapabilityKey): [AiBrainCapabilityKey, undefined] => [
        capability,
        undefined,
      ]
    )
  ) as Record<AiBrainCapabilityKey, AiBrainAssignment | undefined>,
};

export const defaultBrainProviderCatalog: AiBrainProviderCatalog = {
  entries: [
    { pool: 'modelPresets', value: 'gpt-4o-mini' },
    { pool: 'modelPresets', value: 'gpt-4o' },
    { pool: 'modelPresets', value: 'gpt-4.1-mini' },
    { pool: 'modelPresets', value: 'gpt-4.1' },
    { pool: 'modelPresets', value: 'o1-mini' },
    { pool: 'modelPresets', value: 'claude-3-5-sonnet-20241022' },
    { pool: 'modelPresets', value: 'claude-3-5-haiku-20241022' },
    { pool: 'modelPresets', value: 'gemini-1.5-pro' },
    { pool: 'modelPresets', value: 'gemini-1.5-flash' },
  ],
};

export const parseBrainSettings = (raw: string | null | undefined): AiBrainSettings => {
  if (!raw?.trim()) return defaultBrainSettings;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    throw validationError('Invalid AI Brain settings payload.', {
      source: 'ai_brain.settings',
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Invalid AI Brain settings payload.', {
      source: 'ai_brain.settings',
      reason: 'invalid_shape',
    });
  }

  const result = settingsSchema.safeParse(parsed);
  if (!result.success) {
    throw validationError('Invalid AI Brain settings payload.', {
      source: 'ai_brain.settings',
      reason: 'schema_validation_failed',
      issues: result.error.flatten(),
    });
  }

  return result.data;
};

export const parseBrainProviderCatalog = (
  raw: string | null | undefined
): AiBrainProviderCatalog => {
  if (!raw?.trim()) return defaultBrainProviderCatalog;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    throw validationError('Invalid AI Brain provider catalog payload.', {
      source: 'ai_brain.provider_catalog',
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Invalid AI Brain provider catalog payload.', {
      source: 'ai_brain.provider_catalog',
      reason: 'invalid_shape',
    });
  }

  const parsedRecord = parsed as Record<string, unknown>;
  const unsupportedKeys = Object.keys(parsedRecord).filter(
    (key: string): boolean => key !== 'entries'
  );
  if (unsupportedKeys.length > 0) {
    throw validationError('Invalid AI Brain provider catalog payload.', {
      source: 'ai_brain.provider_catalog',
      reason: 'unknown_keys',
      keys: unsupportedKeys,
    });
  }

  const result = providerCatalogSchema.safeParse(parsedRecord);
  if (!result.success) {
    throw validationError('Invalid AI Brain provider catalog payload.', {
      source: 'ai_brain.provider_catalog',
      reason: 'schema_validation_failed',
      issues: result.error.flatten(),
    });
  }

  return {
    entries: sanitizeCatalogEntries(catalogToEntries(result.data)),
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

export const getBrainCapabilityDefinition = (
  capability: AiBrainCapabilityKey
): BrainCapabilityDefinition => BRAIN_CAPABILITY_REGISTRY[capability];

export const getBrainCapabilityModelFamilies = (
  capability: AiBrainCapabilityKey
): readonly BrainModelFamily[] => {
  if (capability === 'ai_paths.model') {
    return AI_PATHS_COMPATIBLE_MODEL_FAMILIES;
  }
  return [getBrainCapabilityDefinition(capability).modelFamily];
};

export const getDefaultCapabilityForFeature = (feature: AiBrainFeature): AiBrainCapabilityKey =>
  DEFAULT_BRAIN_CAPABILITY_BY_FEATURE[feature];

export const resolveBrainFeatureForCapability = (
  capability: AiBrainCapabilityKey
): AiBrainFeature => getBrainCapabilityDefinition(capability).feature;

export const resolveBrainCapabilityAssignment = (
  settings: AiBrainSettings,
  capability: AiBrainCapabilityKey
): AiBrainAssignment => {
  const capabilityOverride = settings.capabilities?.[capability];
  if (capabilityOverride) {
    return {
      ...settings.defaults,
      ...capabilityOverride,
    };
  }
  return resolveBrainAssignment(settings, resolveBrainFeatureForCapability(capability));
};

export const sanitizeBrainAssignment = (assignment: AiBrainAssignment): AiBrainAssignment => ({
  ...assignment,
  modelId: assignment.modelId?.trim() ?? '',
  agentId: assignment.agentId?.trim() ?? '',
  systemPrompt: assignment.systemPrompt?.trim() ?? '',
  notes: assignment.notes?.trim() || null,
});

export const sanitizeBrainAssignmentForProviders = (
  assignment: AiBrainAssignment,
  allowedProviders: AiBrainProvider[]
): AiBrainAssignment => {
  const sanitized = sanitizeBrainAssignment(assignment);
  if (allowedProviders.includes(sanitized.provider)) {
    return sanitized;
  }
  return {
    ...sanitized,
    provider: allowedProviders[0] ?? 'model',
  };
};

export const sanitizeBrainProviderCatalog = (
  catalog: AiBrainProviderCatalog
): AiBrainProviderCatalog => {
  return {
    entries: sanitizeCatalogEntries(catalogToEntries(catalog)),
  };
};

export const toPersistedBrainProviderCatalog = (
  catalog: AiBrainProviderCatalog
): { entries: AiBrainCatalogEntry[] } => ({
  entries: sanitizeCatalogEntries(catalogToEntries(catalog)),
});
