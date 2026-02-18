import { z } from 'zod';

import { dtoBaseSchema } from './base';

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

export const promptExploderSegmentTypeSchema = z.enum([
  'metadata',
  'assigned_text',
  'list',
  'parameter_block',
  'referential_list',
  'sequence',
  'hierarchical_list',
  'conditional_list',
  'qa_matrix',
]);
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
