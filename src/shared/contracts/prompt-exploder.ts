import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Prompt Exploder Basic DTOs
 */

export const promptExploderSegmentTypeSchema = z.enum(['static', 'dynamic', 'conditional', 'list', 'parameter_block', 'metadata', 'sequence', 'qa_matrix', 'hierarchical_list', 'referential_list', 'conditional_list', 'assigned_text']);
export type PromptExploderSegmentTypeDto = z.infer<typeof promptExploderSegmentTypeSchema>;
export type PromptExploderSegmentType = PromptExploderSegmentTypeDto;

export const promptExploderListItemSchema: z.ZodType<PromptExploderListItemDto> = z.lazy(() => z.object({
  id: z.string(),
  label: z.string().optional(),
  value: z.string().optional(),
  text: z.string().optional(),
  description: z.string().optional(),
  logicalOperator: z.string().nullable().optional(),
  logicalConditions: z.array(z.any()).optional(),
  referencedParamPath: z.string().nullable().optional(),
  referencedComparator: z.string().nullable().optional(),
  referencedValue: z.union([z.string(), z.boolean()]).nullable().optional(),
  children: z.array(promptExploderListItemSchema).optional(),
}));

export interface PromptExploderListItemDto {
  id: string;
  label?: string;
  value?: string;
  text?: string;
  description?: string;
  logicalOperator?: string | null;
  logicalConditions?: any[];
  referencedParamPath?: string | null;
  referencedComparator?: string | null;
  referencedValue?: string | boolean | null;
  children?: PromptExploderListItemDto[];
}

export type PromptExploderListItem = PromptExploderListItemDto;

/**
 * Prompt Exploder Logical DTOs
 */

export const promptExploderLogicalOperatorSchema = z.enum(['exists', 'contains', 'matches', 'gt', 'lt', 'eq']);
export type PromptExploderLogicalOperatorDto = z.infer<typeof promptExploderLogicalOperatorSchema>;
export type PromptExploderLogicalOperator = PromptExploderLogicalOperatorDto;

export const promptExploderLogicalComparatorSchema = z.enum(['AND', 'OR']);
export type PromptExploderLogicalComparatorDto = z.infer<typeof promptExploderLogicalComparatorSchema>;
export type PromptExploderLogicalComparator = PromptExploderLogicalComparatorDto;

export const promptExploderLogicalJoinSchema = z.object({
  type: promptExploderLogicalComparatorSchema,
  conditions: z.array(z.any()),
});

export type PromptExploderLogicalJoinDto = z.infer<typeof promptExploderLogicalJoinSchema>;
export type PromptExploderLogicalJoin = PromptExploderLogicalJoinDto;

export const promptExploderLogicalConditionSchema = z.object({
  field: z.string(),
  operator: promptExploderLogicalOperatorSchema,
  value: z.unknown(),
});

export type PromptExploderLogicalConditionDto = z.infer<typeof promptExploderLogicalConditionSchema>;
export type PromptExploderLogicalCondition = PromptExploderLogicalConditionDto;

/**
 * Prompt Exploder Document Structure DTOs
 */

export const promptExploderSubsectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  segments: z.array(z.any()).optional(),
  code: z.string().nullable().optional(),
  items: z.array(z.any()).optional(),
  condition: z.any().optional(),
});

export type PromptExploderSubsectionDto = z.infer<typeof promptExploderSubsectionSchema>;
export type PromptExploderSubsection = PromptExploderSubsectionDto;

export const promptExploderBindingTypeSchema = z.enum(['text', 'number', 'boolean', 'json', 'list']);
export type PromptExploderBindingTypeDto = z.infer<typeof promptExploderBindingTypeSchema>;
export type PromptExploderBindingType = PromptExploderBindingTypeDto;

export const promptExploderBindingOriginSchema = z.enum(['user', 'system', 'learned', 'inferred']);
export type PromptExploderBindingOriginDto = z.infer<typeof promptExploderBindingOriginSchema>;
export type PromptExploderBindingOrigin = PromptExploderBindingOriginDto;

export const promptExploderParamUiControlSchema = z.enum(['text', 'textarea', 'select', 'slider', 'switch']);
export type PromptExploderParamUiControlDto = z.infer<typeof promptExploderParamUiControlSchema>;
export type PromptExploderParamUiControl = PromptExploderParamUiControlDto;

export const promptExploderBindingSchema = z.object({
  key: z.string(),
  type: promptExploderBindingTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
  uiControl: promptExploderParamUiControlSchema.optional(),
  options: z.array(promptExploderListItemSchema).optional(),
  origin: promptExploderBindingOriginSchema,
});

export type PromptExploderBindingDto = z.infer<typeof promptExploderBindingSchema>;
export type PromptExploderBinding = PromptExploderBindingDto;

export const promptExploderSegmentSchema = z.object({
  id: z.string(),
  type: promptExploderSegmentTypeSchema,
  title: z.string().nullable().optional(),
  content: z.string().optional(),
  condition: promptExploderLogicalJoinSchema.nullable().optional(),
  items: z.array(promptExploderListItemSchema).optional(),
  listItems: z.array(promptExploderListItemSchema).optional(),
  subsections: z.array(promptExploderSubsectionSchema).optional(),
  bindingKey: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  raw: z.string().nullable().optional(),
  paramsText: z.string().nullable().optional(),
  paramsObject: z.record(z.string(), z.unknown()).nullable().optional(),
  paramUiControls: z.record(z.string(), z.string()).optional(),
  paramComments: z.record(z.string(), z.string()).optional(),
  paramDescriptions: z.record(z.string(), z.string()).optional(),
  code: z.string().nullable().optional(),
  includeInOutput: z.boolean().optional(),
  confidence: z.number().optional(),
  matchedPatternIds: z.array(z.string()).optional(),
  matchedPatternLabels: z.array(z.string()).optional(),
  matchedSequenceLabels: z.array(z.string()).optional(),
});

export type PromptExploderSegmentDto = z.infer<typeof promptExploderSegmentSchema>;
export type PromptExploderSegment = PromptExploderSegmentDto;

export const promptExploderDocumentSchema = dtoBaseSchema.extend({
  name: z.string(),
  description: z.string().nullable(),
  bindings: z.array(promptExploderBindingSchema),
  sections: z.array(promptExploderSubsectionSchema),
  isActive: z.boolean(),
});

export type PromptExploderDocumentDto = z.infer<typeof promptExploderDocumentSchema>;
export type PromptExploderDocument = PromptExploderDocumentDto;

/**
 * Prompt Exploder Pattern & Template DTOs
 */

export const promptExploderPatternRuleMapSchema = z.record(z.string(), z.array(z.string()));
export type PromptExploderPatternRuleMapDto = z.infer<typeof promptExploderPatternRuleMapSchema>;
export type PromptExploderPatternRuleMap = PromptExploderPatternRuleMapDto;

export const promptExploderLearnedTemplateSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  title: z.string().optional(),
  normalizedTitle: z.string().optional(),
  anchorTokens: z.array(z.string()).optional(),
  segmentType: promptExploderSegmentTypeSchema.optional(),
  usageCount: z.number(),
  lastUsedAt: z.string(),
  state: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
});

export type PromptExploderLearnedTemplateDto = z.infer<typeof promptExploderLearnedTemplateSchema>;
export type PromptExploderLearnedTemplate = PromptExploderLearnedTemplateDto;

export const promptExploderPatternSnapshotSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  bindings: z.record(z.string(), z.unknown()),
  result: z.string(),
});

export type PromptExploderPatternSnapshotDto = z.infer<typeof promptExploderPatternSnapshotSchema>;
export type PromptExploderPatternSnapshot = PromptExploderPatternSnapshotDto;

/**
 * Prompt Exploder Benchmark DTOs
 */

export const promptExploderBenchmarkCaseConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  bindings: z.record(z.string(), z.unknown()),
  expectedKeywords: z.array(z.string()).optional(),
  maxTokens: z.number().optional(),
});

export type PromptExploderBenchmarkCaseConfigDto = z.infer<typeof promptExploderBenchmarkCaseConfigSchema>;
export type PromptExploderBenchmarkCaseConfig = PromptExploderBenchmarkCaseConfigDto;

export const promptExploderBenchmarkSuiteSchema = namedDtoSchema.extend({
  documentId: z.string(),
  cases: z.array(promptExploderBenchmarkCaseConfigSchema),
});

export type PromptExploderBenchmarkSuiteDto = z.infer<typeof promptExploderBenchmarkSuiteSchema>;
export type PromptExploderBenchmarkSuite = PromptExploderBenchmarkSuiteDto;

export const promptExploderBenchmarkSuggestionSchema = z.object({
  id: z.string().optional(),
  caseId: z.string(),
  segmentId: z.string().optional(),
  segmentTitle: z.string().optional(),
  segmentType: z.string().optional(),
  suggestedSegmentType: z.string().optional(),
  suggestedBindings: z.record(z.string(), z.unknown()).optional(),
  reasoning: z.string().optional(),
  suggestedRulePattern: z.string().optional(),
  suggestedRuleTitle: z.string().optional(),
  suggestedPriority: z.number().optional(),
  suggestedConfidenceBoost: z.number().optional(),
  suggestedTreatAsHeading: z.boolean().optional(),
  sampleText: z.string().optional(),
  confidence: z.number().optional(),
  matchedPatternIds: z.array(z.string()).optional(),
});

export type PromptExploderBenchmarkSuggestionDto = z.infer<typeof promptExploderBenchmarkSuggestionSchema>;
export type PromptExploderBenchmarkSuggestion = PromptExploderBenchmarkSuggestionDto;

/**
 * Prompt Exploder Runtime & Settings DTOs
 */

export const promptExploderOperationModeSchema = z.enum(['manual', 'semi-auto', 'automatic']);
export type PromptExploderOperationModeDto = z.infer<typeof promptExploderOperationModeSchema>;
export type PromptExploderOperationMode = PromptExploderOperationModeDto;

export const promptExploderAiProviderSchema = z.enum(['openai', 'anthropic', 'google', 'ollama']);
export type PromptExploderAiProviderDto = z.infer<typeof promptExploderAiProviderSchema>;
export type PromptExploderAiProvider = PromptExploderAiProviderDto;

export const promptExploderCaseResolverCaptureModeSchema = z.enum(['manual', 'assisted', 'fully-auto']);
export type PromptExploderCaseResolverCaptureModeDto = z.infer<typeof promptExploderCaseResolverCaptureModeSchema>;
export type PromptExploderCaseResolverCaptureMode = PromptExploderCaseResolverCaptureModeDto;

export const promptExploderValidationRuleStackSchema = z.object({
  id: z.string(),
  name: z.string(),
  ruleIds: z.array(z.string()),
});

export type PromptExploderValidationRuleStackDto = z.infer<typeof promptExploderValidationRuleStackSchema>;
export type PromptExploderValidationRuleStack = PromptExploderValidationRuleStackDto;

export const promptExploderRuntimeValidationScopeSchema = z.enum(['segment', 'document', 'global', 'case_resolver_prompt_exploder']);
export type PromptExploderRuntimeValidationScopeDto = z.infer<typeof promptExploderRuntimeValidationScopeSchema>;
export type PromptExploderRuntimeValidationScope = PromptExploderRuntimeValidationScopeDto;

export const promptExploderValidationStackResolutionReasonSchema = z.enum(['rule_passed', 'rule_failed', 'rule_skipped', 'exact_match', 'default_scope', 'scope_fallback', 'invalid_stack']);
export type PromptExploderValidationStackResolutionReasonDto = z.infer<typeof promptExploderValidationStackResolutionReasonSchema>;
export type PromptExploderValidationStackResolutionReason = PromptExploderValidationStackResolutionReasonDto;

export const promptExploderValidationStackResolutionSchema = z.object({
  stack: promptExploderValidationRuleStackSchema.optional(),
  stackId: z.string().optional(),
  passed: z.boolean().optional(),
  results: z.array(z.object({
    ruleId: z.string(),
    passed: z.boolean(),
    reason: promptExploderValidationStackResolutionReasonSchema,
    message: z.string().optional(),
  })).optional(),
});

export type PromptExploderValidationStackResolutionDto = z.infer<typeof promptExploderValidationStackResolutionSchema>;
export type PromptExploderValidationStackResolution = PromptExploderValidationStackResolutionDto;

export const promptExploderSettingsSchema = z.object({
  defaultMode: promptExploderOperationModeSchema,
  defaultProvider: promptExploderAiProviderSchema,
  captureMode: promptExploderCaseResolverCaptureModeSchema,
  enableLearning: z.boolean(),
  autoValidate: z.boolean(),
});

export type PromptExploderSettingsDto = z.infer<typeof promptExploderSettingsSchema>;
export type PromptExploderSettings = PromptExploderSettingsDto;
