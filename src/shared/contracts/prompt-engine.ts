import { z } from 'zod';

import { validatorPatternListSchema, validatorScopeSchema, type ValidatorScope } from './validator';
import {
  promptExploderSegmentTypeSchema,
  promptExploderLearnedTemplateSchema,
  promptExploderRuntimeValidationScopeSchema,
  promptExploderValidationRuleStackSchema,
  type PromptExploderLearnedTemplate,
  type PromptExploderRuntimeValidationScope,
  type PromptExploderValidationRuleStack,
} from './prompt-exploder-core';

export type { PromptExploderSegmentType as PromptExploderRuleSegmentType } from './prompt-exploder-core';

export const PROMPT_ENGINE_SETTINGS_KEY = 'prompt_engine_settings';

/**
 * Prompt Validation Types
 */

export const promptValidationSeveritySchema = z.enum(['error', 'warning', 'info']);
export type PromptValidationSeverity = z.infer<typeof promptValidationSeveritySchema>;

export const promptValidationChainModeSchema = z.enum([
  'continue',
  'stop_on_match',
  'stop_on_replace',
]);
export type PromptValidationChainMode = z.infer<typeof promptValidationChainModeSchema>;

export const promptValidationScopeSchema = z.enum([
  'image_studio_prompt',
  'image_studio_extraction',
  'image_studio_generation',
  'prompt_exploder',
  'case_resolver_prompt_exploder',
  'case_resolver_plain_text',
  'ai_paths',
  'global',
]);
export type PromptValidationScope = z.infer<typeof promptValidationScopeSchema>;

export const DEFAULT_SEQUENCE_STEP = 10;

export const IMAGE_STUDIO_SCOPE_VALUES: PromptValidationScope[] = [
  'image_studio_prompt',
  'image_studio_extraction',
  'image_studio_generation',
];

export const IMAGE_STUDIO_SCOPE_SET = new Set<PromptValidationScope>(IMAGE_STUDIO_SCOPE_VALUES);

export const DEFAULT_PROMPT_VALIDATION_SCOPES: PromptValidationScope[] = [
  'image_studio_prompt',
  'image_studio_extraction',
  'image_studio_generation',
  'prompt_exploder',
  'case_resolver_prompt_exploder',
  'case_resolver_plain_text',
  'ai_paths',
  'global',
];

export const promptValidationLaunchScopeBehaviorSchema = z.enum(['gate', 'bypass']);
export type PromptValidationLaunchScopeBehavior = z.infer<
  typeof promptValidationLaunchScopeBehaviorSchema
>;

export const promptValidationLaunchOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
  'gt',
  'gte',
  'lt',
  'lte',
  'is_empty',
  'is_not_empty',
]);
export type PromptValidationLaunchOperator = z.infer<typeof promptValidationLaunchOperatorSchema>;

export const promptExploderCaptureApplyToSchema = z.enum(['segment', 'line']);
export type PromptExploderCaptureApplyTo = z.infer<typeof promptExploderCaptureApplyToSchema>;

export const promptExploderCaptureNormalizeSchema = z.enum([
  'trim',
  'lower',
  'upper',
  'country',
  'day',
  'month',
  'year',
]);
export type PromptExploderCaptureNormalize = z.infer<typeof promptExploderCaptureNormalizeSchema>;

export const promptValidationSimilarSchema = z.object({
  pattern: z.string(),
  flags: z.string().optional(),
  suggestion: z.string(),
  comment: z.string().nullable().optional(),
});

export type PromptValidationSimilar = z.infer<typeof promptValidationSimilarSchema>;

export const promptAutofixOperationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('replace'),
    pattern: z.string(),
    flags: z.string().optional(),
    replacement: z.string(),
    comment: z.string().nullable().optional(),
  }),
  z.object({
    kind: z.literal('params_json'),
    comment: z.string().nullable().optional(),
  }),
]);

export type PromptAutofixOperation = z.infer<typeof promptAutofixOperationSchema>;

export const promptAutofixSchema = z.object({
  enabled: z.boolean(),
  operations: z.array(promptAutofixOperationSchema),
});

export type PromptAutofix = z.infer<typeof promptAutofixSchema>;

export const promptValidationRuleBaseSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  severity: promptValidationSeveritySchema,
  title: z.string(),
  description: z.string().nullable(),
  message: z.string(),
  similar: z.array(promptValidationSimilarSchema),
  autofix: promptAutofixSchema.optional(),
  sequenceGroupId: z.string().nullable().optional(),
  sequenceGroupLabel: z.string().nullable().optional(),
  sequenceGroupDebounceMs: z.number().optional(),
  sequence: z.number().nullable().optional(),
  chainMode: promptValidationChainModeSchema.optional(),
  maxExecutions: z.number().optional(),
  passOutputToNext: z.boolean().optional(),
  appliesToScopes: z.array(promptValidationScopeSchema).optional(),
  launchEnabled: z.boolean().optional(),
  launchAppliesToScopes: z.array(promptValidationScopeSchema).optional(),
  launchScopeBehavior: promptValidationLaunchScopeBehaviorSchema.optional(),
  launchOperator: promptValidationLaunchOperatorSchema.optional(),
  launchValue: z.string().nullable().optional(),
  launchFlags: z.string().nullable().optional(),
  promptExploderSegmentType: promptExploderSegmentTypeSchema.nullable().optional(),
  promptExploderConfidenceBoost: z.number().optional(),
  promptExploderPriority: z.number().optional(),
  promptExploderTreatAsHeading: z.boolean().optional(),
  promptExploderCaptureTarget: z.string().nullable().optional(),
  promptExploderCaptureGroup: z.number().nullable().optional(),
  promptExploderCaptureApplyTo: promptExploderCaptureApplyToSchema.optional(),
  promptExploderCaptureNormalize: promptExploderCaptureNormalizeSchema.optional(),
  promptExploderCaptureOverwrite: z.boolean().optional(),
  pattern: z.string().optional(),
  flags: z.string().optional(),
});

export const promptValidationRuleSchema = z.discriminatedUnion('kind', [
  promptValidationRuleBaseSchema.extend({
    kind: z.literal('regex'),
    pattern: z.string(),
    flags: z.string(),
  }),
  promptValidationRuleBaseSchema.extend({
    kind: z.literal('params_object'),
  }),
]);

export type PromptValidationRule = z.infer<typeof promptValidationRuleSchema>;

export type RuleDraft = {
  uid: string;
  text: string;
  parsed: PromptValidationRule | null;
  error: string | null;
};

export type RulePatch = Partial<PromptValidationRule>;

export const promptValidationSettingsSchema = z.object({
  enabled: z.boolean(),
  rules: z.array(promptValidationRuleSchema),
  learnedRules: z.array(promptValidationRuleSchema).optional(),
});

export type PromptValidationSettings = z.infer<typeof promptValidationSettingsSchema>;

export const promptEngineSettingsSchema = z.object({
  version: z.literal(1),
  promptValidation: promptValidationSettingsSchema,
});

export type PromptEngineSettings = z.infer<typeof promptEngineSettingsSchema>;

/**
 * Prompt Validation Runtime Types
 */

export const promptValidationRuntimeProfileSchema = z.enum(['all', 'pattern_pack', 'learned_only']);
export type PromptValidationRuntimeProfile = z.infer<typeof promptValidationRuntimeProfileSchema>;

export const promptValidationRuntimeIdentitySchema = z.object({
  scope: promptExploderRuntimeValidationScopeSchema,
  validatorScope: validatorScopeSchema,
  stack: promptExploderValidationRuleStackSchema,
  listVersion: z.string(),
  settingsVersion: z.string(),
  profile: promptValidationRuntimeProfileSchema,
  cacheKey: z.string(),
});

export interface PromptValidationRuntimeIdentity {
  scope: PromptExploderRuntimeValidationScope;
  validatorScope: ValidatorScope;
  stack: PromptExploderValidationRuleStack;
  listVersion: string;
  settingsVersion: string;
  profile: PromptValidationRuntimeProfile;
  cacheKey: string;
}

export const promptValidationRuntimeSelectionSchema = z.object({
  identity: promptValidationRuntimeIdentitySchema,
  scopedRules: z.array(promptValidationRuleSchema),
  effectiveRules: z.array(promptValidationRuleSchema),
  runtimeValidationRules: z.array(promptValidationRuleSchema),
  effectiveLearnedTemplates: z.array(promptExploderLearnedTemplateSchema),
  runtimeLearnedTemplates: z.array(promptExploderLearnedTemplateSchema),
});

export interface PromptValidationRuntimeSelection {
  identity: PromptValidationRuntimeIdentity;
  scopedRules: PromptValidationRule[];
  effectiveRules: PromptValidationRule[];
  runtimeValidationRules: PromptValidationRule[];
  effectiveLearnedTemplates: PromptExploderLearnedTemplate[];
  runtimeLearnedTemplates: PromptExploderLearnedTemplate[];
}

export const promptValidationStackResolutionSchema = z.object({
  stack: promptExploderValidationRuleStackSchema,
  scope: promptExploderRuntimeValidationScopeSchema,
  validatorScope: validatorScopeSchema,
  list: validatorPatternListSchema.nullable(),
  reason: z.enum(['exact_match']),
});

export type PromptValidationStackResolution = z.infer<typeof promptValidationStackResolutionSchema>;

export const promptValidationStackResolutionInputSchema = z.object({
  stack: promptExploderValidationRuleStackSchema.nullable().optional(),
  patternLists: z.array(validatorPatternListSchema).nullable().optional(),
});

export type PromptValidationStackResolutionInput = z.infer<
  typeof promptValidationStackResolutionInputSchema
>;

/**
 * Prompt Validation Evaluation Types
 */

export const promptValidationSuggestionSchema = z.object({
  suggestion: z.string(),
  found: z.string().optional(),
  comment: z.string().nullable().optional(),
});

export type PromptValidationSuggestion = z.infer<typeof promptValidationSuggestionSchema>;

export const promptValidationIssueSchema = z.object({
  ruleId: z.string(),
  severity: promptValidationSeveritySchema,
  title: z.string(),
  message: z.string(),
  suggestions: z.array(promptValidationSuggestionSchema),
});

export type PromptValidationIssue = z.infer<typeof promptValidationIssueSchema>;

export const promptValidationExecutionContextSchema = z.object({
  scope: promptValidationScopeSchema.nullable().optional(),
});

export type PromptValidationExecutionContext = z.infer<
  typeof promptValidationExecutionContextSchema
>;

export const promptValidationPreparedRuntimeSchema = z.object({
  enabled: z.boolean(),
  context: promptValidationExecutionContextSchema,
  orderedRules: z.array(promptValidationRuleSchema),
  sequenceGroupCounts: z.record(z.string(), z.number()),
});

export type PromptValidationPreparedRuntime = z.infer<typeof promptValidationPreparedRuntimeSchema>;

/**
 * Prompt Params Types
 */

export const paramSpecKindSchema = z.enum([
  'boolean',
  'number',
  'string',
  'enum',
  'rgb',
  'tuple2',
  'json',
]);
export type ParamSpecKind = z.infer<typeof paramSpecKindSchema>;

export const paramSpecSchema = z.object({
  path: z.string(),
  kind: paramSpecKindSchema,
  hint: z.string().optional(),
  enumOptions: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  integer: z.boolean().optional(),
});

export type ParamSpec = z.infer<typeof paramSpecSchema>;

export const paramIssueSeveritySchema = z.enum(['error', 'warning']);
export type ParamIssueSeverity = z.infer<typeof paramIssueSeveritySchema>;

export const paramIssueSchema = z.object({
  path: z.string(),
  severity: paramIssueSeveritySchema,
  message: z.string(),
  code: z.string().optional(),
});

export type ParamIssue = z.infer<typeof paramIssueSchema>;

export const extractParamsResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    params: z.record(z.string(), z.unknown()),
    objectStart: z.number(),
    objectEnd: z.number(),
    rawObjectText: z.string(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export type ExtractParamsResult = z.infer<typeof extractParamsResultSchema>;

/**
 * Prompt Formatter Types
 */

export const promptAppliedFixSchema = z.object({
  ruleId: z.string(),
  operationKind: z.enum(['replace', 'params_json']),
});

export type PromptAppliedFix = z.infer<typeof promptAppliedFixSchema>;

export const formatPromptResultSchema = z.object({
  prompt: z.string(),
  changed: z.boolean(),
  applied: z.array(promptAppliedFixSchema),
  issuesBefore: z.number(),
  issuesAfter: z.number(),
});

export type FormatPromptResult = z.infer<typeof formatPromptResultSchema>;

export const formatPromptOptionsSchema = z.object({
  precomputedIssuesBefore: z.array(promptValidationIssueSchema).optional(),
  enableIncrementalValidation: z.boolean().optional(),
  preparedRuntime: promptValidationPreparedRuntimeSchema.optional(),
});

export type FormatPromptOptions = z.infer<typeof formatPromptOptionsSchema>;

/**
 * Prompt Validation Observability Types
 */

export const promptValidationTimingNameSchema = z.enum([
  'scope_resolve_ms',
  'runtime_select_ms',
  'runtime_compile_ms',
  'explode_ms',
  'runtime_pipeline_ms',
  'validator_ms',
  'formatter_ms',
]);

export type PromptValidationTimingName = z.infer<typeof promptValidationTimingNameSchema>;

export const promptValidationErrorNameSchema = z.enum([
  'scope_resolution',
  'rule_compile',
  'runtime_execution',
]);

export type PromptValidationErrorName = z.infer<typeof promptValidationErrorNameSchema>;

export const promptValidationCounterNameSchema = z.enum([
  'runtime_selection_total',
  'runtime_cache_hit',
  'runtime_cache_miss',
  'runtime_case_resolver_pack_fallback',
  'runtime_fast_path_hit',
  'runtime_fast_path_miss',
  'runtime_inflight_dedup_hit',
  'runtime_inflight_dedup_miss',
  'runtime_timeout',
  'runtime_backpressure_drop',
  'runtime_circuit_break_open',
]);

export type PromptValidationCounterName = z.infer<typeof promptValidationCounterNameSchema>;

export type ParamLeaf = {
  path: string;
  value: unknown;
};

export const promptValidationRuntimeSloTargetsSchema = z.object({
  p95PipelineMs: z.number(),
  p95ExplodeMs: z.number(),
  p95CompileMs: z.number(),
  maxErrorRate: z.number(),
});

export type PromptValidationRuntimeSloTargets = z.infer<
  typeof promptValidationRuntimeSloTargetsSchema
>;

export const promptValidationRuntimeHealthSchema = z.object({
  status: z.enum(['ok', 'degraded', 'critical']),
  checks: z.array(
    z.object({
      name: z.string(),
      ok: z.boolean(),
      value: z.number(),
      target: z.number(),
    })
  ),
});

export type PromptValidationRuntimeHealth = z.infer<typeof promptValidationRuntimeHealthSchema>;

export const promptValidationObservabilitySnapshotSchema = z.object({
  generatedAt: z.string(),
  metrics: z.array(
    z.object({
      name: promptValidationTimingNameSchema,
      count: z.number(),
      avgMs: z.number(),
      p50Ms: z.number(),
      p95Ms: z.number(),
      maxMs: z.number(),
    })
  ),
  counters: z.record(promptValidationCounterNameSchema, z.number()),
  sloTargets: promptValidationRuntimeSloTargetsSchema,
  health: promptValidationRuntimeHealthSchema,
  errors: z.record(promptValidationErrorNameSchema, z.number()),
});

export type PromptValidationObservabilitySnapshot = z.infer<
  typeof promptValidationObservabilitySnapshotSchema
>;
