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
export type ProductValidationSeverityDto = z.infer<typeof productValidationSeveritySchema>;
export type ProductValidationSeverity = ProductValidationSeverityDto;

export const productValidationDenyBehaviorSchema = z.enum(['ask_again', 'mute_session']);
export type ProductValidationDenyBehaviorDto = z.infer<typeof productValidationDenyBehaviorSchema>;
export type ProductValidationDenyBehavior = ProductValidationDenyBehaviorDto;
export type ProductValidationPatternDenyBehaviorOverride = ProductValidationDenyBehavior | null;

export const productValidationLaunchScopeBehaviorSchema = z.enum(['gate', 'condition_only']);
export type ProductValidationLaunchScopeBehaviorDto = z.infer<
  typeof productValidationLaunchScopeBehaviorSchema
>;
export type ProductValidationLaunchScopeBehavior = ProductValidationLaunchScopeBehaviorDto;

export const productValidationInstanceScopeSchema = z.enum([
  'draft_template',
  'product_create',
  'product_edit',
]);
export type ProductValidationInstanceScopeDto = z.infer<
  typeof productValidationInstanceScopeSchema
>;
export type ProductValidationInstanceScope = ProductValidationInstanceScopeDto;

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
});

export type ProductValidationTargetDto = z.infer<typeof productValidationTargetSchema>;
export type ProductValidationTarget = ProductValidationTargetDto;
export type ProductValidationRuntimeTypeDto = 'none' | 'database_query' | 'ai_prompt';
export type ProductValidationRuntimeType = ProductValidationRuntimeTypeDto;
export type ProductValidationPostAcceptBehaviorDto = 'revalidate' | 'stop_after_accept';
export type ProductValidationPostAcceptBehavior = ProductValidationPostAcceptBehaviorDto;
export type ProductValidationChainModeDto = 'continue' | 'stop_on_match' | 'stop_on_replace';
export type ProductValidationChainMode = ProductValidationChainModeDto;
export type ProductValidationLaunchSourceModeDto =
  | 'current_field'
  | 'form_field'
  | 'latest_product_field';
export type ProductValidationLaunchSourceMode = ProductValidationLaunchSourceModeDto;
export type ProductValidationLaunchOperatorDto =
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
export type ProductValidationLaunchOperator = ProductValidationLaunchOperatorDto;

export type ProductValidationPatternDto = z.infer<typeof productValidationPatternSchema>;
export type ProductValidationPattern = ProductValidationPatternDto;

export const createProductValidationPatternSchema = productValidationPatternSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    locale: z.string().nullable().optional(),
    flags: z.string().nullable().optional(),
    severity: productValidationSeveritySchema.nullable().optional(),
    enabled: z.boolean().optional(),
    replacementEnabled: z.boolean().optional(),
    replacementAutoApply: z.boolean().optional(),
    skipNoopReplacementProposal: z.boolean().optional(),
    replacementValue: z.string().nullable().optional(),
    replacementFields: z.array(z.string()).optional(),
    runtimeEnabled: z.boolean().optional(),
    runtimeType: z.enum(['none', 'database_query', 'ai_prompt']).optional(),
    runtimeConfig: z.string().nullable().optional(),
    postAcceptBehavior: z.enum(['revalidate', 'stop_after_accept']).optional(),
    denyBehaviorOverride: productValidationDenyBehaviorSchema.nullable().optional(),
    validationDebounceMs: z.number().optional(),
    sequenceGroupId: z.string().nullable().optional(),
    sequenceGroupLabel: z.string().nullable().optional(),
    sequenceGroupDebounceMs: z.number().optional(),
    sequence: z.number().nullable().optional(),
    chainMode: z.enum(['continue', 'stop_on_match', 'stop_on_replace']).optional(),
    maxExecutions: z.number().optional(),
    passOutputToNext: z.boolean().optional(),
    launchEnabled: z.boolean().optional(),
    launchSourceMode: z.enum(['current_field', 'form_field', 'latest_product_field']).optional(),
    launchSourceField: z.string().nullable().optional(),
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
    launchFlags: z.string().nullable().optional(),
  });

export type CreateProductValidationPatternDto = z.infer<
  typeof createProductValidationPatternSchema
>;

export const updateProductValidationPatternSchema = createProductValidationPatternSchema
  .partial()
  .extend({
    expectedUpdatedAt: z.string().nullable().optional(),
  });

export type UpdateProductValidationPatternDto = z.infer<
  typeof updateProductValidationPatternSchema
>;

export const productValidationSequenceGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  debounceMs: z.number(),
  patternIds: z.array(z.string()),
});

export type ProductValidationSequenceGroupDto = z.infer<
  typeof productValidationSequenceGroupSchema
>;

export const productValidatorSettingsSchema = z.object({
  enabledByDefault: z.boolean(),
  formatterEnabledByDefault: z.boolean(),
  instanceDenyBehavior: z.record(
    productValidationInstanceScopeSchema,
    productValidationDenyBehaviorSchema
  ),
});

export type ProductValidationInstanceDenyBehaviorMapDto = z.infer<
  typeof productValidatorSettingsSchema
>['instanceDenyBehavior'];
export type ProductValidatorSettingsDto = z.infer<typeof productValidatorSettingsSchema>;
export type ProductValidatorSettings = ProductValidatorSettingsDto;
export type ProductValidationInstanceDenyBehaviorMap = ProductValidationInstanceDenyBehaviorMapDto;

export const productValidatorConfigSchema = z.object({
  enabledByDefault: z.boolean(),
  formatterEnabledByDefault: z.boolean(),
  instanceDenyBehavior: z.record(
    productValidationInstanceScopeSchema,
    productValidationDenyBehaviorSchema
  ),
  patterns: z.array(productValidationPatternSchema),
});

export type ProductValidatorConfigDto = z.infer<typeof productValidatorConfigSchema>;
export type ProductValidatorConfig = ProductValidatorConfigDto;

/**
 * Product Validation Replacement DTOs
 */

export const dynamicReplacementSourceModeSchema = z.enum([
  'current_field',
  'form_field',
  'latest_product_field',
]);
export type DynamicReplacementSourceModeDto = z.infer<typeof dynamicReplacementSourceModeSchema>;
export type DynamicReplacementSourceMode = DynamicReplacementSourceModeDto;

export const dynamicReplacementMathOperationSchema = z.enum([
  'none',
  'add',
  'subtract',
  'multiply',
  'divide',
]);
export type DynamicReplacementMathOperationDto = z.infer<
  typeof dynamicReplacementMathOperationSchema
>;
export type DynamicReplacementMathOperation = DynamicReplacementMathOperationDto;

export const dynamicReplacementRoundModeSchema = z.enum(['none', 'round', 'floor', 'ceil']);
export type DynamicReplacementRoundModeDto = z.infer<typeof dynamicReplacementRoundModeSchema>;
export type DynamicReplacementRoundMode = DynamicReplacementRoundModeDto;

export const dynamicReplacementResultAssemblySchema = z.enum([
  'segment_only',
  'source_replace_match',
]);
export type DynamicReplacementResultAssemblyDto = z.infer<
  typeof dynamicReplacementResultAssemblySchema
>;
export type DynamicReplacementResultAssembly = DynamicReplacementResultAssemblyDto;

export const dynamicReplacementTargetApplySchema = z.enum([
  'replace_whole_field',
  'replace_matched_segment',
]);
export type DynamicReplacementTargetApplyDto = z.infer<typeof dynamicReplacementTargetApplySchema>;
export type DynamicReplacementTargetApply = DynamicReplacementTargetApplyDto;

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
export type DynamicReplacementLogicOperatorDto = z.infer<
  typeof dynamicReplacementLogicOperatorSchema
>;
export type DynamicReplacementLogicOperator = DynamicReplacementLogicOperatorDto;

export const dynamicReplacementLogicActionSchema = z.enum(['keep', 'set_value', 'clear', 'abort']);
export type DynamicReplacementLogicActionDto = z.infer<typeof dynamicReplacementLogicActionSchema>;
export type DynamicReplacementLogicAction = DynamicReplacementLogicActionDto;

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

export type DynamicReplacementRecipeDto = z.infer<typeof dynamicReplacementRecipeSchema>;
export type DynamicReplacementRecipe = DynamicReplacementRecipeDto;

export const productReplacementModeSchema = z.enum(['static', 'dynamic']);
export type ProductReplacementModeDto = z.infer<typeof productReplacementModeSchema>;
export type ReplacementMode = ProductReplacementModeDto;

export const productValidationSequenceGroupDraftSchema = z.object({
  label: z.string(),
  debounceMs: z.string(),
});

export type ProductValidationSequenceGroupDraftDto = z.infer<
  typeof productValidationSequenceGroupDraftSchema
>;
export type SequenceGroupDraft = ProductValidationSequenceGroupDraftDto;

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

export type ProductValidationPatternFormDataDto = z.infer<
  typeof productValidationPatternFormDataSchema
>;

/**
 * Product Studio Sequencing DTOs
 */

