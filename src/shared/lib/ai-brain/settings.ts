/**
 * AI Brain Settings
 * 
 * Configuration and settings management for AI Brain system.
 * Provides:
 * - Brain catalog and pool management
 * - Provider configuration
 * - Feature and capability assignments
 * - Model family definitions
 * - Centralized Brain settings
 */

import {
  type AiBrainCatalogEntry,
  type AiBrainCatalogPool,
  type AiBrainProvider,
  type AiBrainFeature,
  type AiBrainCapabilityKey,
  type AiBrainAssignment,
  type AiBrainSettings,
  type AiBrainProviderCatalog,
  type AiBrainRoutingResponse,
  type BrainModelFamily,
  type BrainAppliedMeta,
  type BrainExecutionConfig,
  type AiPathsNodeExecutionInput,
  aiBrainSettingsSchema as settingsSchema,
  aiBrainProviderCatalogSchema as providerCatalogSchema,
  AI_BRAIN_SETTINGS_KEY as SETTINGS_KEY,
  AI_BRAIN_PROVIDER_CATALOG_KEY as CATALOG_KEY,
  AI_BRAIN_ROUTING_COLLECTION as ROUTING_COLLECTION,
  AI_BRAIN_ROUTING_GLOBAL_ID as ROUTING_GLOBAL_ID,
} from '@/shared/contracts/ai-brain';
import { validationError } from '@/shared/errors/app-error';
import { catalogToEntries, sanitizeCatalogEntries } from '@/shared/lib/ai-brain/catalog-entries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type {
  AiBrainCatalogEntry,
  AiBrainCatalogPool,
  AiBrainProvider,
  AiBrainFeature,
  AiBrainCapabilityKey,
  AiBrainAssignment,
  AiBrainSettings,
  AiBrainProviderCatalog,
  AiBrainRoutingResponse,
  BrainModelFamily,
  BrainAppliedMeta,
  BrainExecutionConfig,
  AiPathsNodeExecutionInput,
};

export const AI_BRAIN_SETTINGS_KEY = SETTINGS_KEY;
export const AI_BRAIN_PROVIDER_CATALOG_KEY = CATALOG_KEY;
export const AI_BRAIN_ROUTING_COLLECTION = ROUTING_COLLECTION;
export const AI_BRAIN_ROUTING_GLOBAL_ID = ROUTING_GLOBAL_ID;

/**
 * List of all available feature keys that can have AI Brain assignments.
 */
export const BRAIN_FEATURE_KEYS: AiBrainFeature[] = [
  'image_studio',
  'products',
  'case_resolver',
  'agent_runtime',
  'agent_teaching',
  'kangur_ai_tutor',
  'social_publishing',
  'analytics',
  'runtime_analytics',
  'cms_builder',
  'system_logs',
  'error_logs',
  'ai_paths',
  'chatbot',
  'prompt_engine',
  'playwright',
  'job_board',
];

/**
 * Policy for capability assignments, defining if they can use agents or only models.
 */
export type AiBrainCapabilityPolicy = 'model-only' | 'agent-or-model';

/**
 * Definition of a specific AI Brain capability.
 */
export type BrainCapabilityDefinition = {
  /** Unique key for the capability. */
  key: AiBrainCapabilityKey;
  /** The feature this capability belongs to. */
  feature: AiBrainFeature;
  /** Human-readable label for the capability. */
  label: string;
  /** The assignment policy for this capability. */
  policy: AiBrainCapabilityPolicy;
  /** The expected model family for this capability. */
  modelFamily: BrainModelFamily;
};

const AI_PATHS_COMPATIBLE_MODEL_FAMILIES: readonly BrainModelFamily[] = [
  'chat',
  'validation',
  'vision_extract',
  'ocr',
];

/**
 * Registry of all known AI Brain capabilities across different features.
 */
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
  'social_publishing.post_generation': {
    key: 'social_publishing.post_generation',
    feature: 'social_publishing',
    label: 'Social Publishing Post Generation',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'social_publishing.visual_analysis': {
    key: 'social_publishing.visual_analysis',
    feature: 'social_publishing',
    label: 'Social Publishing Visual Analysis',
    policy: 'model-only',
    modelFamily: 'vision_extract',
  },
  'social_publishing.doc_patching': {
    key: 'social_publishing.doc_patching',
    feature: 'social_publishing',
    label: 'Social Publishing Doc Patching',
    policy: 'model-only',
    modelFamily: 'chat',
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
  'product.scan.amazon_candidate_match': {
    key: 'product.scan.amazon_candidate_match',
    feature: 'products',
    label: 'Product Scan Amazon Candidate Match',
    policy: 'model-only',
    modelFamily: 'vision_extract',
  },
  'product.scan.1688_supplier_match': {
    key: 'product.scan.1688_supplier_match',
    feature: 'products',
    label: 'Product Scan 1688 Supplier Match',
    policy: 'model-only',
    modelFamily: 'vision_extract',
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
  'selector_registry.role_classification': {
    key: 'selector_registry.role_classification',
    feature: 'integrations',
    label: 'Selector Registry Role Classification',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'playwright.ai_evaluator_step': {
    key: 'playwright.ai_evaluator_step',
    feature: 'playwright',
    label: 'Playwright AI Evaluator Step',
    policy: 'model-only',
    modelFamily: 'vision_extract',
  },
  'playwright.probe_suggestions': {
    key: 'playwright.probe_suggestions',
    feature: 'playwright',
    label: 'Playwright Probe Suggestions',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'playwright.ai_code_injector': {
    key: 'playwright.ai_code_injector',
    feature: 'playwright',
    label: 'Playwright AI Code Injector',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'job_board.offer_extraction': {
    key: 'job_board.offer_extraction',
    feature: 'job_board',
    label: 'Job Board Offer Extraction',
    policy: 'model-only',
    modelFamily: 'chat',
  },
  'job_board.vision_email_finder': {
    key: 'job_board.vision_email_finder',
    feature: 'job_board',
    label: 'Job Board Vision Email Finder',
    policy: 'model-only',
    modelFamily: 'vision_extract',
  },
  'job_board.vision_navigation': {
    key: 'job_board.vision_navigation',
    feature: 'job_board',
    label: 'Job Board Vision Navigation',
    policy: 'model-only',
    modelFamily: 'chat',
  },
};

/**
 * All valid capability keys for AI Brain.
 */
export const BRAIN_CAPABILITY_KEYS = Object.keys(
  BRAIN_CAPABILITY_REGISTRY
) as AiBrainCapabilityKey[];

/**
 * Mapping of features to their default capability key.
 */
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
  social_publishing: 'social_publishing.post_generation',
  products: 'product.description.generation',
  case_resolver: 'case_resolver.ocr',
  agent_runtime: 'agent_runtime.default',
  agent_teaching: 'agent_teaching.chat',
  prompt_engine: 'prompt_engine.prompt_exploder',
  integrations: 'selector_registry.role_classification',
  playwright: 'playwright.ai_evaluator_step',
  job_board: 'job_board.offer_extraction',
};

/**
 * Default AI Brain assignment settings.
 */
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

/**
 * Default global AI Brain settings, initialized with default assignments for each feature and capability.
 */
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

/**
 * Default provider catalog entries.
 */
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
    { pool: 'paidModels', value: 'gpt-image-1' },
    { pool: 'paidModels', value: 'dall-e-3' },
    { pool: 'paidModels', value: 'dall-e-2' },
  ],
};

/**
 * Parses a raw AI Brain settings string into a validated AiBrainSettings object.
 * 
 * @param raw - The raw JSON string from settings storage.
 * @returns The validated AiBrainSettings object.
 * @throws {AppError} If parsing or validation fails.
 */
export const parseBrainSettings = (raw: string | null | undefined): AiBrainSettings => {
  if (!raw?.trim()) return defaultBrainSettings;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    logClientError(error);
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

/**
 * Parses a raw provider catalog string into a validated AiBrainProviderCatalog object.
 * 
 * @param raw - The raw JSON string from storage.
 * @returns The validated AiBrainProviderCatalog object.
 * @throws {AppError} If parsing or validation fails.
 */
export const parseBrainProviderCatalog = (
  raw: string | null | undefined
): AiBrainProviderCatalog => {
  if (!raw?.trim()) return defaultBrainProviderCatalog;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    logClientError(error);
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

/**
 * Resolves the effective assignment for a given feature, merging global defaults with feature-specific overrides.
 * 
 * @param settings - The current AI Brain settings.
 * @param feature - The feature to resolve for.
 * @returns The resolved assignment.
 */
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

/**
 * Retrieves the definition for a specific capability.
 * 
 * @param capability - The capability key.
 * @returns The capability definition.
 */
export const getBrainCapabilityDefinition = (
  capability: AiBrainCapabilityKey
): BrainCapabilityDefinition => BRAIN_CAPABILITY_REGISTRY[capability];

/**
 * Gets the allowed model families for a specific capability.
 * 
 * @param capability - The capability key.
 * @returns A list of allowed model families.
 */
export const getBrainCapabilityModelFamilies = (
  capability: AiBrainCapabilityKey
): readonly BrainModelFamily[] => {
  if (capability === 'ai_paths.model') {
    return AI_PATHS_COMPATIBLE_MODEL_FAMILIES;
  }
  return [getBrainCapabilityDefinition(capability).modelFamily];
};

/**
 * Gets the default capability key for a given feature.
 * 
 * @param feature - The feature key.
 * @returns The default capability key.
 */
export const getDefaultCapabilityForFeature = (feature: AiBrainFeature): AiBrainCapabilityKey =>
  DEFAULT_BRAIN_CAPABILITY_BY_FEATURE[feature];

/**
 * Resolves which feature a specific capability belongs to.
 * 
 * @param capability - The capability key.
 * @returns The parent feature key.
 */
export const resolveBrainFeatureForCapability = (
  capability: AiBrainCapabilityKey
): AiBrainFeature => getBrainCapabilityDefinition(capability).feature;

/**
 * Resolves the effective assignment for a specific capability.
 * Merges defaults, feature overrides, and capability overrides.
 * 
 * @param settings - The current AI Brain settings.
 * @param capability - The capability key.
 * @returns The resolved assignment.
 */
export const resolveBrainCapabilityAssignment = (
  settings: AiBrainSettings,
  capability: AiBrainCapabilityKey
): AiBrainAssignment => {
  const feature = resolveBrainFeatureForCapability(capability);
  const featureAssignment = resolveBrainAssignment(settings, feature);
  const capabilityOverride = settings.capabilities?.[capability];
  const resolvedAssignment = capabilityOverride
    ? {
        ...settings.defaults,
        ...capabilityOverride,
      }
    : featureAssignment;

  // If the feature as a whole is disabled, the capability is also disabled
  if (featureAssignment.enabled) {
    return resolvedAssignment;
  }

  return {
    ...resolvedAssignment,
    enabled: false,
  };
};

/**
 * Sanitizes an assignment object by trimming string fields.
 * 
 * @param assignment - The assignment to sanitize.
 * @returns The sanitized assignment.
 */
export const sanitizeBrainAssignment = (assignment: AiBrainAssignment): AiBrainAssignment => ({
  ...assignment,
  modelId: assignment.modelId?.trim() ?? '',
  agentId: assignment.agentId?.trim() ?? '',
  systemPrompt: assignment.systemPrompt?.trim() ?? '',
  notes: assignment.notes?.trim() || null,
});

/**
 * Sanitizes an assignment and ensures the provider is among the allowed ones.
 * 
 * @param assignment - The assignment to sanitize.
 * @param allowedProviders - List of allowed provider types.
 * @returns The sanitized and validated assignment.
 */
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

/**
 * Sanitizes a provider catalog.
 * 
 * @param catalog - The catalog to sanitize.
 * @returns The sanitized catalog.
 */
export const sanitizeBrainProviderCatalog = (
  catalog: AiBrainProviderCatalog
): AiBrainProviderCatalog => {
  return {
    entries: sanitizeCatalogEntries(catalogToEntries(catalog)),
  };
};

/**
 * Prepares a provider catalog for persistence by sanitizing its entries.
 * 
 * @param catalog - The catalog to prepare.
 * @returns An object containing sanitized catalog entries.
 */
export const toPersistedBrainProviderCatalog = (
  catalog: AiBrainProviderCatalog
): { entries: AiBrainCatalogEntry[] } => ({
  entries: sanitizeCatalogEntries(catalogToEntries(catalog)),
});
