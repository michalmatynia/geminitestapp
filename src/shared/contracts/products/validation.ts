import { z } from 'zod';

import { dtoBaseSchema } from '../base';
export const productValidationTargetSchema = z.enum([
  'name',
  'description',
  'sku',
  'price',
  'stock',
  'category',
  'size_length',
  'size_width',
  'length',
  'weight',
]);

export const productValidationSeveritySchema = z.enum(['error', 'warning']);
export type ProductValidationSeverity = z.infer<typeof productValidationSeveritySchema>;

export const productValidationDenyBehaviorSchema = z.enum(['ask_again', 'mute_session']);
export type ProductValidationDenyBehavior = z.infer<typeof productValidationDenyBehaviorSchema>;
export type ProductValidationPatternDenyBehaviorOverride = ProductValidationDenyBehavior | null;

export const productValidationLaunchScopeBehaviorSchema = z.enum(['gate', 'condition_only']);
export type ProductValidationLaunchScopeBehavior = z.infer<
  typeof productValidationLaunchScopeBehaviorSchema
>;

export const productValidationInstanceScopeSchema = z.enum([
  'draft_template',
  'product_create',
  'product_edit',
]);
export type ProductValidationInstanceScope = z.infer<typeof productValidationInstanceScopeSchema>;

export const LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION = 2 as const;

export const productValidationSemanticStateSchema = z.object({
  version: z.literal(LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION),
  presetId: z.string().trim().min(1).nullable().optional(),
  operation: z.string().trim().min(1),
  sourceField: z.string().trim().min(1).nullable().optional(),
  targetField: z.string().trim().min(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ProductValidationSemanticState = z.infer<
  typeof productValidationSemanticStateSchema
>;

export const productValidationSemanticTransitionKindSchema = z.enum([
  'none',
  'recognized',
  'cleared',
  'preserved',
  'updated',
  'migrated',
]);
export type ProductValidationSemanticTransitionKind = z.infer<
  typeof productValidationSemanticTransitionKindSchema
>;

export const productValidationSemanticAuditSourceSchema = z.enum([
  'manual_save',
  'import',
  'template',
]);
export type ProductValidationSemanticAuditSource = z.infer<
  typeof productValidationSemanticAuditSourceSchema
>;

export const productValidationSemanticAuditTriggerSchema = z.enum(['create', 'update']);
export type ProductValidationSemanticAuditTrigger = z.infer<
  typeof productValidationSemanticAuditTriggerSchema
>;

export const productValidationSemanticAuditRecordSchema = z.object({
  recordedAt: z.string().datetime(),
  source: productValidationSemanticAuditSourceSchema,
  trigger: productValidationSemanticAuditTriggerSchema,
  transition: productValidationSemanticTransitionKindSchema,
  previous: productValidationSemanticStateSchema.nullable(),
  current: productValidationSemanticStateSchema.nullable(),
});
export type ProductValidationSemanticAuditRecord = z.infer<
  typeof productValidationSemanticAuditRecordSchema
>;

export type ProductValidationDenyIssueInput = {
  fieldName: string;
  patternId: string;
  message?: string | null;
  replacementValue?: string | null;
};

export type ProductValidationAcceptIssueInput = {
  fieldName: string;
  patternId: string;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  message?: string | null;
  replacementValue?: string | null;
};

export const productValidationPatternSchema = dtoBaseSchema.extend({
  label: z.string(),
  target: productValidationTargetSchema,
  locale: z.string().nullable(),
  regex: z.string(),
  flags: z.string().nullable(),
  message: z.string(),
  severity: productValidationSeveritySchema,
  enabled: z.boolean(),
  replacementEnabled: z.boolean(),
  replacementAutoApply: z.boolean(),
  skipNoopReplacementProposal: z.boolean(),
  replacementValue: z.string().nullable(),
  replacementFields: z.array(z.string()),
  replacementAppliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
  runtimeEnabled: z.boolean(),
  runtimeType: z.enum(['none', 'database_query', 'ai_prompt']),
  runtimeConfig: z.string().nullable(),
  postAcceptBehavior: z.enum(['revalidate', 'stop_after_accept']),
  denyBehaviorOverride: productValidationDenyBehaviorSchema.nullable(),
  validationDebounceMs: z.number(),
  sequenceGroupId: z.string().nullable(),
  sequenceGroupLabel: z.string().nullable(),
  sequenceGroupDebounceMs: z.number(),
  sequence: z.number().nullable(),
  chainMode: z.enum(['continue', 'stop_on_match', 'stop_on_replace']),
  maxExecutions: z.number(),
  passOutputToNext: z.boolean(),
  launchEnabled: z.boolean(),
  launchAppliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
  launchScopeBehavior: z.enum(['gate', 'condition_only']).optional(),
  launchSourceMode: z.enum(['current_field', 'form_field', 'latest_product_field']),
  launchSourceField: z.string().nullable(),
  launchOperator: z.enum([
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
  ]),
  launchValue: z.string().nullable(),
  launchFlags: z.string().nullable(),
  appliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
  semanticState: productValidationSemanticStateSchema.nullable().optional(),
  semanticAudit: productValidationSemanticAuditRecordSchema.nullable().optional(),
  semanticAuditHistory: z.array(productValidationSemanticAuditRecordSchema).optional(),
});

export type ProductValidationTarget = z.infer<typeof productValidationTargetSchema>;
export type ProductValidationRuntimeType = 'none' | 'database_query' | 'ai_prompt';
export type ProductValidationPostAcceptBehavior = 'revalidate' | 'stop_after_accept';
export type ProductValidationChainMode = 'continue' | 'stop_on_match' | 'stop_on_replace';
export type ProductValidationLaunchSourceMode =
  | 'current_field'
  | 'form_field'
  | 'latest_product_field';
export type ProductValidationLaunchOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty';

export type FieldValidatorIssue = {
  patternId: string;
  message: string;
  severity: 'error' | 'warning';
  matchText: string;
  index: number;
  length: number;
  regex: string;
  flags: string | null;
  replacementValue: string | null;
  replacementApplyMode: 'replace_whole_field' | 'replace_matched_segment';
  replacementScope: 'none' | 'global' | 'field';
  replacementActive: boolean;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  debounceMs: number;
};

export type ProductValidationPattern = z.infer<typeof productValidationPatternSchema>;

export const createProductValidationPatternSchema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  target: productValidationTargetSchema,
  locale: z.string().trim().nullable().optional(),
  regex: z.string().min(1, 'Regex is required'),
  flags: z.string().trim().nullable().optional(),
  message: z.string().trim().min(1, 'Message is required'),
  severity: productValidationSeveritySchema.optional(),
  enabled: z.boolean().optional(),
  replacementEnabled: z.boolean().optional(),
  replacementAutoApply: z.boolean().optional(),
  skipNoopReplacementProposal: z.boolean().optional(),
  replacementValue: z.string().trim().nullable().optional(),
  replacementFields: z.array(z.string()).optional(),
  replacementAppliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
  runtimeEnabled: z.boolean().optional(),
  runtimeType: z.enum(['none', 'database_query', 'ai_prompt']).optional(),
  runtimeConfig: z.string().trim().nullable().optional(),
  postAcceptBehavior: z.enum(['revalidate', 'stop_after_accept']).optional(),
  denyBehaviorOverride: productValidationDenyBehaviorSchema.nullable().optional(),
  validationDebounceMs: z.number().int().min(0).max(30000).optional(),
  sequenceGroupId: z.string().trim().nullable().optional(),
  sequenceGroupLabel: z.string().trim().nullable().optional(),
  sequenceGroupDebounceMs: z.number().int().min(0).max(30000).optional(),
  sequence: z.number().int().min(0).nullable().optional(),
  chainMode: z.enum(['continue', 'stop_on_match', 'stop_on_replace']).optional(),
  maxExecutions: z.number().int().min(1).max(20).optional(),
  passOutputToNext: z.boolean().optional(),
  launchEnabled: z.boolean().optional(),
  launchAppliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
  launchScopeBehavior: productValidationLaunchScopeBehaviorSchema.optional(),
  launchSourceMode: z.enum(['current_field', 'form_field', 'latest_product_field']).optional(),
  launchSourceField: z.string().trim().nullable().optional(),
  launchOperator: z
    .enum([
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
    ])
    .optional(),
  launchValue: z.string().nullable().optional(),
  launchFlags: z.string().trim().nullable().optional(),
  appliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
  semanticState: productValidationSemanticStateSchema.nullable().optional(),
});

export type CreateProductValidationPatternInput = z.infer<
  typeof createProductValidationPatternSchema
>;

export const updateProductValidationPatternSchema = createProductValidationPatternSchema
  .partial()
  .extend({
    expectedUpdatedAt: z.string().nullable().optional(),
  });

export type UpdateProductValidationPatternInput = z.infer<
  typeof updateProductValidationPatternSchema
>;

export const productValidationSequenceGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  debounceMs: z.number(),
  patternIds: z.array(z.string()),
});

export type ProductValidationSequenceGroup = z.infer<typeof productValidationSequenceGroupSchema>;

export const productValidatorSettingsSchema = z.object({
  enabledByDefault: z.boolean(),
  formatterEnabledByDefault: z.boolean(),
  instanceDenyBehavior: z.record(
    productValidationInstanceScopeSchema,
    productValidationDenyBehaviorSchema
  ),
});

export type ProductValidationInstanceDenyBehaviorMap = z.infer<
  typeof productValidatorSettingsSchema
>['instanceDenyBehavior'];
export type ProductValidatorSettings = z.infer<typeof productValidatorSettingsSchema>;

export const updateProductValidatorSettingsSchema = z.object({
  enabledByDefault: z.boolean().optional(),
  formatterEnabledByDefault: z.boolean().optional(),
  instanceDenyBehavior: z
    .record(productValidationInstanceScopeSchema, productValidationDenyBehaviorSchema)
    .optional(),
});

export type UpdateProductValidatorSettings = z.infer<typeof updateProductValidatorSettingsSchema>;

export const productValidatorConfigSchema = z.object({
  enabledByDefault: z.boolean(),
  formatterEnabledByDefault: z.boolean(),
  instanceDenyBehavior: z.record(
    productValidationInstanceScopeSchema,
    productValidationDenyBehaviorSchema
  ),
  patterns: z.array(productValidationPatternSchema),
});

export type ProductValidatorConfig = z.infer<typeof productValidatorConfigSchema>;

/**
 * Product Validation Replacement DTOs
 */

export const dynamicReplacementSourceModeSchema = z.enum([
  'current_field',
  'form_field',
  'latest_product_field',
]);
export type DynamicReplacementSourceMode = z.infer<typeof dynamicReplacementSourceModeSchema>;

export const dynamicReplacementMathOperationSchema = z.enum([
  'none',
  'add',
  'subtract',
  'multiply',
  'divide',
]);
export type DynamicReplacementMathOperation = z.infer<typeof dynamicReplacementMathOperationSchema>;

export const dynamicReplacementRoundModeSchema = z.enum(['none', 'round', 'floor', 'ceil']);
export type DynamicReplacementRoundMode = z.infer<typeof dynamicReplacementRoundModeSchema>;

export const dynamicReplacementResultAssemblySchema = z.enum([
  'segment_only',
  'source_replace_match',
]);
export type DynamicReplacementResultAssembly = z.infer<
  typeof dynamicReplacementResultAssemblySchema
>;

export const dynamicReplacementTargetApplySchema = z.enum([
  'replace_whole_field',
  'replace_matched_segment',
]);
export type DynamicReplacementTargetApply = z.infer<typeof dynamicReplacementTargetApplySchema>;

export const dynamicReplacementLogicOperatorSchema = z.enum([
  'none',
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
export type DynamicReplacementLogicOperator = z.infer<typeof dynamicReplacementLogicOperatorSchema>;

export const dynamicReplacementLogicActionSchema = z.enum(['keep', 'set_value', 'clear', 'abort']);
export type DynamicReplacementLogicAction = z.infer<typeof dynamicReplacementLogicActionSchema>;

export const dynamicReplacementRecipeSchema = z.object({
  version: z.literal(1),
  sourceMode: dynamicReplacementSourceModeSchema,
  sourceField: z.string().nullable().optional(),
  sourceRegex: z.string().nullable().optional(),
  sourceFlags: z.string().nullable().optional(),
  sourceMatchGroup: z.number().nullable().optional(),
  mathOperation: dynamicReplacementMathOperationSchema.optional(),
  mathOperand: z.number().nullable().optional(),
  roundMode: dynamicReplacementRoundModeSchema.optional(),
  padLength: z.number().nullable().optional(),
  padChar: z.string().nullable().optional(),
  logicOperator: dynamicReplacementLogicOperatorSchema.optional(),
  logicOperand: z.string().nullable().optional(),
  logicFlags: z.string().nullable().optional(),
  logicWhenTrueAction: dynamicReplacementLogicActionSchema.optional(),
  logicWhenTrueValue: z.string().nullable().optional(),
  logicWhenFalseAction: dynamicReplacementLogicActionSchema.optional(),
  logicWhenFalseValue: z.string().nullable().optional(),
  resultAssembly: dynamicReplacementResultAssemblySchema.optional(),
  targetApply: dynamicReplacementTargetApplySchema.optional(),
});

export type DynamicReplacementRecipe = z.infer<typeof dynamicReplacementRecipeSchema>;

export const productReplacementModeSchema = z.enum(['static', 'dynamic']);
export type ProductReplacementMode = z.infer<typeof productReplacementModeSchema>;
export type ReplacementMode = ProductReplacementMode;

export const productValidationSequenceGroupDraftSchema = z.object({
  label: z.string(),
  debounceMs: z.string(),
});

export type ProductValidationSequenceGroupDraft = z.infer<
  typeof productValidationSequenceGroupDraftSchema
>;
export type SequenceGroupDraft = ProductValidationSequenceGroupDraft;

export const productValidationPatternFormDataSchema = z.object({
  label: z.string(),
  target: productValidationTargetSchema,
  locale: z.string(),
  regex: z.string(),
  flags: z.string(),
  message: z.string(),
  severity: productValidationSeveritySchema,
  enabled: z.boolean(),
  replacementEnabled: z.boolean(),
  replacementAutoApply: z.boolean(),
  skipNoopReplacementProposal: z.boolean(),
  replacementValue: z.string(),
  replacementFields: z.array(z.string()),
  replacementAppliesToScopes: z.array(productValidationInstanceScopeSchema),
  postAcceptBehavior: z.enum(['revalidate', 'stop_after_accept']),
  denyBehaviorOverride: z.enum(['inherit', 'ask_again', 'mute_session']),
  validationDebounceMs: z.string(),
  replacementMode: productReplacementModeSchema,
  sourceMode: dynamicReplacementSourceModeSchema,
  sourceField: z.string(),
  sourceRegex: z.string(),
  sourceFlags: z.string(),
  sourceMatchGroup: z.string(),
  launchEnabled: z.boolean(),
  launchAppliesToScopes: z.array(productValidationInstanceScopeSchema),
  launchScopeBehavior: z.enum(['gate', 'condition_only']),
  launchSourceMode: dynamicReplacementSourceModeSchema,
  launchSourceField: z.string(),
  launchOperator: dynamicReplacementLogicOperatorSchema,
  launchValue: z.string(),
  launchFlags: z.string(),
  mathOperation: dynamicReplacementMathOperationSchema,
  mathOperand: z.string(),
  roundMode: dynamicReplacementRoundModeSchema,
  padLength: z.string(),
  padChar: z.string(),
  logicOperator: dynamicReplacementLogicOperatorSchema,
  logicOperand: z.string(),
  logicFlags: z.string(),
  logicWhenTrueAction: dynamicReplacementLogicActionSchema,
  logicWhenTrueValue: z.string(),
  logicWhenFalseAction: dynamicReplacementLogicActionSchema,
  logicWhenFalseValue: z.string(),
  resultAssembly: dynamicReplacementResultAssemblySchema,
  targetApply: dynamicReplacementTargetApplySchema,
  sequenceGroupId: z.string(),
  sequence: z.string(),
  chainMode: z.enum(['continue', 'stop_on_match', 'stop_on_replace']),
  maxExecutions: z.string(),
  passOutputToNext: z.boolean(),
  runtimeEnabled: z.boolean(),
  runtimeType: z.enum(['none', 'database_query', 'ai_prompt']),
  runtimeConfig: z.string(),
  appliesToScopes: z.array(productValidationInstanceScopeSchema),
});

export type ProductValidationPatternFormData = z.infer<
  typeof productValidationPatternFormDataSchema
>;

export const reorderProductValidationPatternUpdateSchema = z.object({
  id: z.string().trim().min(1),
  sequence: z.number().int().min(0).optional(),
  sequenceGroupId: z.string().trim().nullable().optional(),
  sequenceGroupLabel: z.string().trim().nullable().optional(),
  sequenceGroupDebounceMs: z.number().int().min(0).max(30000).optional(),
  expectedUpdatedAt: z.string().trim().nullable().optional(),
});

export type ReorderProductValidationPatternUpdate = z.infer<
  typeof reorderProductValidationPatternUpdateSchema
>;

/**
 * Product Studio Sequencing DTOs
 */
