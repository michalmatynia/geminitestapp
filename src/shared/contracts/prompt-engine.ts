import { z } from 'zod';

import { validatorPatternListSchema, validatorScopeSchema } from './admin';
import {
  promptExploderSegmentTypeSchema,
  promptExploderLearnedTemplateSchema,
  promptExploderRuntimeValidationScopeSchema,
  promptExploderValidationRuleStackSchema,
} from './prompt-exploder';

/**
 * Prompt Validation DTOs
 */

export const promptValidationSeveritySchema = z.enum(['error', 'warning', 'info']);
export type PromptValidationSeverityDto = z.infer<typeof promptValidationSeveritySchema>;

export const promptValidationChainModeSchema = z.enum(['continue', 'stop_on_match', 'stop_on_replace']);
export type PromptValidationChainModeDto = z.infer<typeof promptValidationChainModeSchema>;

export const promptValidationScopeSchema = z.enum([
  'image_studio_prompt',
  'image_studio_extraction',
  'image_studio_generation',
  'prompt_exploder',
  'case_resolver_prompt_exploder',
  'global',
]);
export type PromptValidationScopeDto = z.infer<typeof promptValidationScopeSchema>;

export const promptValidationLaunchScopeBehaviorSchema = z.enum(['gate', 'bypass']);
export type PromptValidationLaunchScopeBehaviorDto = z.infer<typeof promptValidationLaunchScopeBehaviorSchema>;

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
export type PromptValidationLaunchOperatorDto = z.infer<typeof promptValidationLaunchOperatorSchema>;

export type PromptExploderSegmentTypeDto = z.infer<typeof promptExploderSegmentTypeSchema>;

export const promptExploderCaptureApplyToSchema = z.enum(['segment', 'line']);
export type PromptExploderCaptureApplyToDto = z.infer<typeof promptExploderCaptureApplyToSchema>;

export const promptExploderCaptureNormalizeSchema = z.enum([
  'trim',
  'lower',
  'upper',
  'country',
  'day',
  'month',
  'year',
]);
export type PromptExploderCaptureNormalizeDto = z.infer<typeof promptExploderCaptureNormalizeSchema>;

export const promptValidationSimilarSchema = z.object({
  pattern: z.string(),
  flags: z.string().optional(),
  suggestion: z.string(),
  comment: z.string().nullable().optional(),
});

export type PromptValidationSimilarDto = z.infer<typeof promptValidationSimilarSchema>;

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

export type PromptAutofixOperationDto = z.infer<typeof promptAutofixOperationSchema>;

export const promptAutofixSchema = z.object({
  enabled: z.boolean(),
  operations: z.array(promptAutofixOperationSchema),
});

export type PromptAutofixDto = z.infer<typeof promptAutofixSchema>;

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

export type PromptValidationRuleDto = z.infer<typeof promptValidationRuleSchema>;

export const promptValidationSettingsSchema = z.object({
  enabled: z.boolean(),
  rules: z.array(promptValidationRuleSchema),
  learnedRules: z.array(promptValidationRuleSchema).optional(),
});

export type PromptValidationSettingsDto = z.infer<typeof promptValidationSettingsSchema>;

export const promptEngineSettingsSchema = z.object({
  version: z.literal(1),
  promptValidation: promptValidationSettingsSchema,
});

export type PromptEngineSettingsDto = z.infer<typeof promptEngineSettingsSchema>;

/**
 * Prompt Validation Runtime DTOs
 */

export const promptValidationRuntimeProfileSchema = z.enum(['all', 'pattern_pack', 'learned_only']);
export type PromptValidationRuntimeProfileDto = z.infer<typeof promptValidationRuntimeProfileSchema>;

export const promptValidationRuntimeIdentitySchema = z.object({
  scope: promptExploderRuntimeValidationScopeSchema,
  validatorScope: validatorScopeSchema,
  stack: promptExploderValidationRuleStackSchema,
  listVersion: z.string(),
  settingsVersion: z.string(),
  profile: promptValidationRuntimeProfileSchema,
  cacheKey: z.string(),
});

export type PromptValidationRuntimeIdentityDto = z.infer<typeof promptValidationRuntimeIdentitySchema>;

export const promptValidationRuntimeSelectionSchema = z.object({
  identity: promptValidationRuntimeIdentitySchema,
  scopedRules: z.array(promptValidationRuleSchema),
  effectiveRules: z.array(promptValidationRuleSchema),
  runtimeValidationRules: z.array(promptValidationRuleSchema),
  effectiveLearnedTemplates: z.array(promptExploderLearnedTemplateSchema),
  runtimeLearnedTemplates: z.array(promptExploderLearnedTemplateSchema),
});

export type PromptValidationRuntimeSelectionDto = z.infer<typeof promptValidationRuntimeSelectionSchema>;

export const promptValidationStackResolutionSchema = z.object({
  stack: promptExploderValidationRuleStackSchema,
  scope: promptExploderRuntimeValidationScopeSchema,
  validatorScope: validatorScopeSchema,
  list: validatorPatternListSchema.nullable(),
  usedFallback: z.boolean(),
  reason: z.enum(['exact_match', 'default_scope', 'scope_fallback', 'invalid_stack']),
});

export type PromptValidationStackResolutionDto = z.infer<typeof promptValidationStackResolutionSchema>;

/**
 * Prompt Validation Evaluation DTOs
 */

export const promptValidationSuggestionSchema = z.object({
  suggestion: z.string(),
  found: z.string().optional(),
  comment: z.string().nullable().optional(),
});

export type PromptValidationSuggestionDto = z.infer<typeof promptValidationSuggestionSchema>;

export const promptValidationIssueSchema = z.object({
  ruleId: z.string(),
  severity: promptValidationSeveritySchema,
  title: z.string(),
  message: z.string(),
  suggestions: z.array(promptValidationSuggestionSchema),
});

export type PromptValidationIssueDto = z.infer<typeof promptValidationIssueSchema>;

export const promptValidationExecutionContextSchema = z.object({
  scope: promptValidationScopeSchema.nullable().optional(),
});

export type PromptValidationExecutionContextDto = z.infer<typeof promptValidationExecutionContextSchema>;

export const promptValidationPreparedRuntimeSchema = z.object({
  enabled: z.boolean(),
  context: promptValidationExecutionContextSchema,
  orderedRules: z.array(promptValidationRuleSchema),
  sequenceGroupCounts: z.record(z.string(), z.number()),
});

export type PromptValidationPreparedRuntimeDto = z.infer<typeof promptValidationPreparedRuntimeSchema>;

/**
 * Prompt Params DTOs
 */

export const paramSpecKindSchema = z.enum(['boolean', 'number', 'string', 'enum', 'rgb', 'tuple2', 'json']);
export type ParamSpecKindDto = z.infer<typeof paramSpecKindSchema>;

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

export type ParamSpecDto = z.infer<typeof paramSpecSchema>;

export const paramIssueSeveritySchema = z.enum(['error', 'warning']);
export type ParamIssueSeverityDto = z.infer<typeof paramIssueSeveritySchema>;

export const paramIssueSchema = z.object({
  path: z.string(),
  severity: paramIssueSeveritySchema,
  message: z.string(),
  code: z.string().optional(),
});

export type ParamIssueDto = z.infer<typeof paramIssueSchema>;

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

export type ExtractParamsResultDto = z.infer<typeof extractParamsResultSchema>;

/**
 * Prompt Formatter DTOs
 */

export const promptAppliedFixSchema = z.object({
  ruleId: z.string(),
  operationKind: promptAutofixOperationSchema.options[0].shape.kind.or(z.literal('replace')), // Simplified for compatibility
});

export type PromptAppliedFixDto = z.infer<typeof promptAppliedFixSchema>;

export const formatPromptResultSchema = z.object({
  prompt: z.string(),
  changed: z.boolean(),
  applied: z.array(promptAppliedFixSchema),
  issuesBefore: z.number(),
  issuesAfter: z.number(),
});

export type FormatPromptResultDto = z.infer<typeof formatPromptResultSchema>;

export const formatPromptOptionsSchema = z.object({
  precomputedIssuesBefore: z.array(promptValidationIssueSchema).optional(),
  enableIncrementalValidation: z.boolean().optional(),
});

export type FormatPromptOptionsDto = z.infer<typeof formatPromptOptionsSchema>;
