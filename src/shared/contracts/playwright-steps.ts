import { z } from 'zod';

import {
  playwrightIdentityProfileSchema,
  playwrightProxyProviderPresetSchema,
  playwrightProxySessionModeSchema,
} from './playwright';

/**
 * Playwright Step Sequencer — domain contracts
 */

// ---------------------------------------------------------------------------
// Step type
// ---------------------------------------------------------------------------

export const playwrightStepTypeSchema = z.enum([
  'navigate',
  'click',
  'fill',
  'select',
  'check',
  'uncheck',
  'hover',
  'wait_for_selector',
  'wait_for_timeout',
  'wait_for_load_state',
  'screenshot',
  'assert_text',
  'assert_visible',
  'assert_url',
  'scroll',
  'press_key',
  'upload_file',
  'custom_script',
]);

export type PlaywrightStepType = z.infer<typeof playwrightStepTypeSchema>;

export const PLAYWRIGHT_STEP_TYPE_LABELS: Record<PlaywrightStepType, string> = {
  navigate: 'Navigate',
  click: 'Click',
  fill: 'Fill',
  select: 'Select',
  check: 'Check',
  uncheck: 'Uncheck',
  hover: 'Hover',
  wait_for_selector: 'Wait for selector',
  wait_for_timeout: 'Wait (timeout)',
  wait_for_load_state: 'Wait for load state',
  screenshot: 'Screenshot',
  assert_text: 'Assert text',
  assert_visible: 'Assert visible',
  assert_url: 'Assert URL',
  scroll: 'Scroll',
  press_key: 'Press key',
  upload_file: 'Upload file',
  custom_script: 'Custom script',
};

// ---------------------------------------------------------------------------
// Modular dynamic input bindings
// ---------------------------------------------------------------------------

export const playwrightStepInputBindingModeSchema = z.enum([
  'literal',
  'selectorRegistry',
  'runtimeVariable',
  'computed',
  'disabled',
]);

export type PlaywrightStepInputBindingMode = z.infer<
  typeof playwrightStepInputBindingModeSchema
>;

export const playwrightStepInputBindingSchema = z.object({
  mode: playwrightStepInputBindingModeSchema,
  value: z.unknown().optional(),
  selectorNamespace: z.string().nullable().optional(),
  selectorKey: z.string().nullable().optional(),
  selectorProfile: z.string().nullable().optional(),
  fallbackSelector: z.string().nullable().optional(),
  variableKey: z.string().nullable().optional(),
  expression: z.string().nullable().optional(),
  disabledReason: z.string().nullable().optional(),
});

export type PlaywrightStepInputBinding = z.infer<
  typeof playwrightStepInputBindingSchema
>;

export const playwrightStepSelectorResolutionSchema = z.object({
  field: z.string(),
  mode: playwrightStepInputBindingModeSchema,
  selectorNamespace: z.string().nullable().optional(),
  selectorKey: z.string().nullable(),
  selectorProfile: z.string().nullable(),
  fallbackSelector: z.string().nullable(),
  resolvedSelector: z.string().nullable(),
  connected: z.boolean(),
});

export type PlaywrightStepSelectorResolution = z.infer<
  typeof playwrightStepSelectorResolutionSchema
>;

export const playwrightStepCodeSnapshotSchema = z.object({
  language: z.literal('playwright-ts'),
  moduleKey: z.string(),
  semanticSnippet: z.string(),
  resolvedSnippet: z.string(),
  unresolvedBindings: z.array(z.string()),
  selectorBindings: z.array(playwrightStepSelectorResolutionSchema),
  generatedAt: z.string().nullable().optional(),
});

export type PlaywrightStepCodeSnapshot = z.infer<
  typeof playwrightStepCodeSnapshotSchema
>;

export const playwrightStepCodePreviewStepSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  label: z.string().nullable().optional(),
  type: playwrightStepTypeSchema.or(z.string()).nullable().optional(),
  selector: z.string().nullable().optional(),
  selectorNamespace: z.string().nullable().optional(),
  selectorKey: z.string().nullable().optional(),
  selectorProfile: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  timeout: z.number().nullable().optional(),
  script: z.string().nullable().optional(),
  inputBindings: z.record(z.string(), playwrightStepInputBindingSchema).optional(),
});

export type PlaywrightStepCodePreviewStep = z.infer<
  typeof playwrightStepCodePreviewStepSchema
>;

export const playwrightStepSnippetRequestSchema = z.object({
  step: playwrightStepCodePreviewStepSchema,
});

export type PlaywrightStepSnippetRequest = z.infer<
  typeof playwrightStepSnippetRequestSchema
>;

export const playwrightStepSnippetResponseSchema = z.object({
  inputBindings: z.record(z.string(), playwrightStepInputBindingSchema),
  snapshot: playwrightStepCodeSnapshotSchema,
  warnings: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      selectorKey: z.string().nullable().optional(),
      selectorProfile: z.string().nullable().optional(),
    })
  ),
});

export type PlaywrightStepSnippetResponse = z.infer<
  typeof playwrightStepSnippetResponseSchema
>;

// ---------------------------------------------------------------------------
// PlaywrightStep — individual browser automation step
// ---------------------------------------------------------------------------

export const playwrightStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: playwrightStepTypeSchema,
  // Execution parameters
  selector: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  timeout: z.number().nullable().optional(),
  script: z.string().nullable().optional(),
  inputBindings: z.record(z.string(), playwrightStepInputBindingSchema).optional(),
  // Scope — null means "shared" (available to all websites / flows)
  websiteId: z.string().nullable(),
  flowId: z.string().nullable(),
  tags: z.array(z.string()),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightStep = z.infer<typeof playwrightStepSchema>;

export const createPlaywrightStepSchema = playwrightStepSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightStep = z.infer<typeof createPlaywrightStepSchema>;

// ---------------------------------------------------------------------------
// PlaywrightStepSet — ordered combination of steps
// ---------------------------------------------------------------------------

export const playwrightStepSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  stepIds: z.array(z.string()),
  // Scope
  websiteId: z.string().nullable(),
  flowId: z.string().nullable(),
  shared: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightStepSet = z.infer<typeof playwrightStepSetSchema>;

export const createPlaywrightStepSetSchema = playwrightStepSetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightStepSet = z.infer<typeof createPlaywrightStepSetSchema>;

// ---------------------------------------------------------------------------
// PlaywrightAction — ordered blocks assembled in the action constructor
// ---------------------------------------------------------------------------

export const playwrightActionExecutionBrowserPreferenceSchema = z.enum([
  'auto',
  'brave',
  'chrome',
  'chromium',
]);

export type PlaywrightActionExecutionBrowserPreference = z.infer<
  typeof playwrightActionExecutionBrowserPreferenceSchema
>;

export const playwrightActionExecutionSettingsSchema = z.object({
  identityProfile: playwrightIdentityProfileSchema.nullable().optional().default(null),
  headless: z.boolean().nullable().optional().default(null),
  browserPreference: playwrightActionExecutionBrowserPreferenceSchema
    .nullable()
    .optional()
    .default(null),
  emulateDevice: z.boolean().nullable().optional().default(null),
  deviceName: z.string().nullable().optional().default(null),
  slowMo: z.number().int().min(0).nullable().optional().default(null),
  timeout: z.number().int().min(1000).nullable().optional().default(null),
  navigationTimeout: z.number().int().min(1000).nullable().optional().default(null),
  locale: z.string().nullable().optional().default(null),
  timezoneId: z.string().nullable().optional().default(null),
  humanizeMouse: z.boolean().nullable().optional().default(null),
  mouseJitter: z.number().int().min(0).nullable().optional().default(null),
  clickDelayMin: z.number().int().min(0).nullable().optional().default(null),
  clickDelayMax: z.number().int().min(0).nullable().optional().default(null),
  inputDelayMin: z.number().int().min(0).nullable().optional().default(null),
  inputDelayMax: z.number().int().min(0).nullable().optional().default(null),
  actionDelayMin: z.number().int().min(0).nullable().optional().default(null),
  actionDelayMax: z.number().int().min(0).nullable().optional().default(null),
  proxyEnabled: z.boolean().nullable().optional().default(null),
  proxyServer: z.string().nullable().optional().default(null),
  proxyUsername: z.string().nullable().optional().default(null),
  proxyPassword: z.string().nullable().optional().default(null),
  proxySessionAffinity: z.boolean().nullable().optional().default(null),
  proxySessionMode: playwrightProxySessionModeSchema.nullable().optional().default(null),
  proxyProviderPreset: playwrightProxyProviderPresetSchema
    .nullable()
    .optional()
    .default(null),
});

export type PlaywrightActionExecutionSettings = z.infer<
  typeof playwrightActionExecutionSettingsSchema
>;

export const defaultPlaywrightActionExecutionSettings: PlaywrightActionExecutionSettings = {
  identityProfile: null,
  headless: null,
  browserPreference: null,
  emulateDevice: null,
  deviceName: null,
  slowMo: null,
  timeout: null,
  navigationTimeout: null,
  locale: null,
  timezoneId: null,
  humanizeMouse: null,
  mouseJitter: null,
  clickDelayMin: null,
  clickDelayMax: null,
  inputDelayMin: null,
  inputDelayMax: null,
  actionDelayMin: null,
  actionDelayMax: null,
  proxyEnabled: null,
  proxyServer: null,
  proxyUsername: null,
  proxyPassword: null,
  proxySessionAffinity: null,
  proxySessionMode: null,
  proxyProviderPreset: null,
};

const normalizeNullableText = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function normalizePlaywrightActionExecutionSettings(
  settings?: Partial<PlaywrightActionExecutionSettings> | null
): PlaywrightActionExecutionSettings {
  const parsed = playwrightActionExecutionSettingsSchema.parse(settings ?? {});

  return {
    ...parsed,
    deviceName: normalizeNullableText(parsed.deviceName),
    locale: normalizeNullableText(parsed.locale),
    timezoneId: normalizeNullableText(parsed.timezoneId),
    proxyServer: normalizeNullableText(parsed.proxyServer),
    proxyUsername: normalizeNullableText(parsed.proxyUsername),
    proxyPassword: normalizeNullableText(parsed.proxyPassword),
  };
}

export const playwrightContextColorSchemeSchema = z.enum(['light', 'dark']);
export type PlaywrightContextColorScheme = z.infer<
  typeof playwrightContextColorSchemeSchema
>;

export const playwrightContextReducedMotionSchema = z.enum([
  'no-preference',
  'reduce',
]);
export type PlaywrightContextReducedMotion = z.infer<
  typeof playwrightContextReducedMotionSchema
>;

export const playwrightActionBlockConfigSchema = z.object({
  viewportWidth: z.number().int().min(320).max(6000).nullable().optional().default(null),
  viewportHeight: z.number().int().min(320).max(6000).nullable().optional().default(null),
  settleDelayMs: z.number().int().min(0).max(30000).nullable().optional().default(null),
  locale: z.string().nullable().optional().default(null),
  timezoneId: z.string().nullable().optional().default(null),
  userAgent: z.string().nullable().optional().default(null),
  colorScheme: playwrightContextColorSchemeSchema
    .nullable()
    .optional()
    .default(null),
  reducedMotion: playwrightContextReducedMotionSchema
    .nullable()
    .optional()
    .default(null),
  geolocationLatitude: z.number().min(-90).max(90).nullable().optional().default(null),
  geolocationLongitude: z.number().min(-180).max(180).nullable().optional().default(null),
  permissions: z.array(z.string()).optional().default([]),
});

export type PlaywrightActionBlockConfig = z.infer<typeof playwrightActionBlockConfigSchema>;

export const defaultPlaywrightActionBlockConfig: PlaywrightActionBlockConfig = {
  viewportWidth: null,
  viewportHeight: null,
  settleDelayMs: null,
  locale: null,
  timezoneId: null,
  userAgent: null,
  colorScheme: null,
  reducedMotion: null,
  geolocationLatitude: null,
  geolocationLongitude: null,
  permissions: [],
};

export function normalizePlaywrightActionBlockConfig(
  config?: Partial<PlaywrightActionBlockConfig> | null
): PlaywrightActionBlockConfig {
  const parsed = playwrightActionBlockConfigSchema.parse(config ?? {});

  return {
    ...parsed,
    locale: normalizeNullableText(parsed.locale),
    timezoneId: normalizeNullableText(parsed.timezoneId),
    userAgent: normalizeNullableText(parsed.userAgent),
    permissions: parsed.permissions
      .map((permission) => permission.trim())
      .filter((permission) => permission.length > 0),
  };
}

export function hasPlaywrightActionBlockConfigOverrides(
  config?: Partial<PlaywrightActionBlockConfig> | null
): boolean {
  const normalized = normalizePlaywrightActionBlockConfig(config);

  return (
    normalized.viewportWidth !== null ||
    normalized.viewportHeight !== null ||
    normalized.settleDelayMs !== null ||
    normalized.locale !== null ||
    normalized.timezoneId !== null ||
    normalized.userAgent !== null ||
    normalized.colorScheme !== null ||
    normalized.reducedMotion !== null ||
    normalized.geolocationLatitude !== null ||
    normalized.geolocationLongitude !== null ||
    normalized.permissions.length > 0
  );
}

export const playwrightActionBlockKindSchema = z.enum(['step', 'step_set', 'runtime_step']);

export type PlaywrightActionBlockKind = z.infer<typeof playwrightActionBlockKindSchema>;

export const playwrightActionBlockSchema = z.object({
  id: z.string(),
  kind: playwrightActionBlockKindSchema,
  refId: z.string(),
  enabled: z.boolean().optional().default(true),
  label: z.string().nullable().optional().default(null),
  config: playwrightActionBlockConfigSchema.optional().default(defaultPlaywrightActionBlockConfig),
});

export type PlaywrightActionBlock = z.infer<typeof playwrightActionBlockSchema>;

export const playwrightActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  /** Optional browser-execution runtime key for marketplace-native action sequences. */
  runtimeKey: z.string().nullable().optional().default(null),
  /** Ordered list of editable blocks that make up this action. */
  blocks: z.array(playwrightActionBlockSchema).optional().default([]),
  /** Legacy compatibility field derived from action blocks. */
  stepSetIds: z.array(z.string()).optional().default([]),
  /** Which persona to run this action with (null = use default). */
  personaId: z.string().nullable(),
  /** Action-owned execution defaults layered on top of integration/runtime defaults. */
  executionSettings: playwrightActionExecutionSettingsSchema
    .optional()
    .default(defaultPlaywrightActionExecutionSettings),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightAction = z.infer<typeof playwrightActionSchema>;

export function createLegacyPlaywrightActionStepSetBlock(
  actionId: string,
  stepSetId: string,
  index: number
): PlaywrightActionBlock {
  return {
    id: `${actionId}__step_set__${index}`,
    kind: 'step_set',
    refId: stepSetId,
    enabled: true,
    label: null,
    config: defaultPlaywrightActionBlockConfig,
  };
}

export function normalizePlaywrightAction(action: PlaywrightAction): PlaywrightAction {
  const blocks = action.blocks.length > 0
    ? action.blocks.map((block) => ({
        ...block,
        config: normalizePlaywrightActionBlockConfig(block.config),
      }))
    : action.stepSetIds.map((stepSetId, index) =>
        createLegacyPlaywrightActionStepSetBlock(action.id, stepSetId, index)
      );

  return {
    ...action,
    runtimeKey: action.runtimeKey ?? null,
    blocks,
    executionSettings: normalizePlaywrightActionExecutionSettings(action.executionSettings),
    stepSetIds: blocks
      .filter((block) => block.kind === 'step_set')
      .map((block) => block.refId),
  };
}

export const createPlaywrightActionSchema = playwrightActionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightAction = z.infer<typeof createPlaywrightActionSchema>;

export const playwrightActionSequenceSnippetEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.enum(['direct_step', 'step_set_step', 'runtime_step', 'missing', 'disabled']),
  semanticSnippet: z.string(),
  resolvedSnippet: z.string(),
  moduleKey: z.string().nullable(),
  registryConnected: z.boolean(),
  unresolvedBindings: z.array(z.string()),
});

export type PlaywrightActionSequenceSnippetEntry = z.infer<
  typeof playwrightActionSequenceSnippetEntrySchema
>;

export const playwrightActionSequenceCodeSnapshotSchema = z.object({
  language: z.literal('playwright-ts'),
  semanticSnippet: z.string(),
  resolvedSnippet: z.string(),
  unresolvedBindings: z.array(z.string()),
  generatedAt: z.string().nullable().optional(),
});

export type PlaywrightActionSequenceCodeSnapshot = z.infer<
  typeof playwrightActionSequenceCodeSnapshotSchema
>;

export const playwrightActionSequenceSnippetRequestSchema = z.object({
  actionName: z.string().optional(),
  blocks: z.array(playwrightActionBlockSchema),
  steps: z.array(playwrightStepSchema),
  stepSets: z.array(playwrightStepSetSchema),
  runtimeStepLabels: z.record(z.string(), z.string()).optional(),
});

export type PlaywrightActionSequenceSnippetRequest = z.infer<
  typeof playwrightActionSequenceSnippetRequestSchema
>;

export const playwrightActionSequenceSnippetResponseSchema = z.object({
  actionName: z.string(),
  entries: z.array(playwrightActionSequenceSnippetEntrySchema),
  snapshot: playwrightActionSequenceCodeSnapshotSchema,
  warnings: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      message: z.string(),
    })
  ),
});

export type PlaywrightActionSequenceSnippetResponse = z.infer<
  typeof playwrightActionSequenceSnippetResponseSchema
>;

// ---------------------------------------------------------------------------
// PlaywrightWebsite — a named site that steps/sets can be scoped to
// ---------------------------------------------------------------------------

export const playwrightWebsiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightWebsite = z.infer<typeof playwrightWebsiteSchema>;

export const createPlaywrightWebsiteSchema = playwrightWebsiteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightWebsite = z.infer<typeof createPlaywrightWebsiteSchema>;

// ---------------------------------------------------------------------------
// PlaywrightFlow — a named user journey within a website
// ---------------------------------------------------------------------------

export const playwrightFlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  websiteId: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightFlow = z.infer<typeof playwrightFlowSchema>;

export const createPlaywrightFlowSchema = playwrightFlowSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightFlow = z.infer<typeof createPlaywrightFlowSchema>;

// ---------------------------------------------------------------------------
// Settings key for persistence
// ---------------------------------------------------------------------------

export const PLAYWRIGHT_STEPS_SETTINGS_KEY = 'playwright_steps';
export const PLAYWRIGHT_STEP_SETS_SETTINGS_KEY = 'playwright_step_sets';
export const PLAYWRIGHT_ACTIONS_SETTINGS_KEY = 'playwright_actions';
export const PLAYWRIGHT_WEBSITES_SETTINGS_KEY = 'playwright_websites';
export const PLAYWRIGHT_FLOWS_SETTINGS_KEY = 'playwright_flows';
