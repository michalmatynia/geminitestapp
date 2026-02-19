import { z } from 'zod';

import { validatorPatternListSchema, validatorScopeSchema } from './admin';

/**
 * Prompt Exploder DTOs
 */

export const promptExploderLogicalOperatorSchema = z.enum(['if', 'only_if', 'unless', 'when']);
export type PromptExploderLogicalOperatorDto = z.infer<typeof promptExploderLogicalOperatorSchema>;

export const promptExploderRuntimeValidationScopeSchema = z.enum([
  'products',
  'image-studio',
  'prompt-exploder',
  'prompt_exploder',
  'case-resolver-prompt-exploder',
  'case_resolver_prompt_exploder',
]);
export type PromptExploderRuntimeValidationScopeDto = z.infer<
  typeof promptExploderRuntimeValidationScopeSchema
>;

export const promptExploderValidationRuleStackSchema = z.string();
export type PromptExploderValidationRuleStackDto = z.infer<
  typeof promptExploderValidationRuleStackSchema
>;

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

export const promptExploderLogicalComparatorSchema = z.enum([
  'truthy',
  'falsy',
  'equals',
  'not_equals',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
]);
export type PromptExploderLogicalComparatorDto = z.infer<typeof promptExploderLogicalComparatorSchema>;

export const promptExploderLogicalJoinSchema = z.enum(['and', 'or']);
export type PromptExploderLogicalJoinDto = z.infer<typeof promptExploderLogicalJoinSchema>;

export const promptExploderLogicalConditionSchema = z.object({
  id: z.string(),
  paramPath: z.string(),
  comparator: promptExploderLogicalComparatorSchema,
  value: z.unknown(),
  joinWithPrevious: promptExploderLogicalJoinSchema.nullable().optional(),
});

export type PromptExploderLogicalConditionDto = z.infer<typeof promptExploderLogicalConditionSchema>;

export interface PromptExploderListItemDto {
  id: string;
  text: string;
  logicalOperator?: PromptExploderLogicalOperatorDto | null | undefined;
  logicalConditions?: PromptExploderLogicalConditionDto[] | undefined;
  referencedParamPath?: string | null | undefined;
  referencedComparator?: PromptExploderLogicalComparatorDto | null | undefined;
  referencedValue?: unknown | undefined;
  children: PromptExploderListItemDto[];
}

export const promptExploderListItemSchema: z.ZodType<PromptExploderListItemDto> = z.lazy(() =>
  z.object({
    id: z.string(),
    text: z.string(),
    logicalOperator: promptExploderLogicalOperatorSchema.nullable().optional(),
    logicalConditions: z.array(promptExploderLogicalConditionSchema).optional(),
    referencedParamPath: z.string().nullable().optional(),
    referencedComparator: promptExploderLogicalComparatorSchema.nullable().optional(),
    referencedValue: z.unknown().optional(),
    children: z.array(promptExploderListItemSchema),
  })
);

export const promptExploderSubsectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  code: z.string().nullable(),
  items: z.array(promptExploderListItemSchema),
  condition: z.string().nullable(),
  guidance: z.string().nullable().optional(),
});

export type PromptExploderSubsectionDto = z.infer<typeof promptExploderSubsectionSchema>;

export const promptExploderBindingTypeSchema = z.enum(['references', 'depends_on', 'uses_param']);
export type PromptExploderBindingTypeDto = z.infer<typeof promptExploderBindingTypeSchema>;

export const promptExploderBindingOriginSchema = z.enum(['auto', 'manual']);
export type PromptExploderBindingOriginDto = z.infer<typeof promptExploderBindingOriginSchema>;

export const promptExploderParamUiControlSchema = z.enum([
  'auto',
  'checkbox',
  'buttons',
  'select',
  'slider',
  'number',
  'text',
  'textarea',
  'json',
  'rgb',
  'tuple2',
]);
export type PromptExploderParamUiControlDto = z.infer<typeof promptExploderParamUiControlSchema>;

export const promptExploderParamUiOverridesSchema = z.object({
  control: promptExploderParamUiControlSchema.optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  hidden: z.boolean().optional(),
  placeholder: z.string().optional(),
});

export type PromptExploderParamUiOverridesDto = z.infer<typeof promptExploderParamUiOverridesSchema>;

export const promptExploderBindingSchema = z.object({
  id: z.string(),
  type: promptExploderBindingTypeSchema,
  fromSegmentId: z.string(),
  toSegmentId: z.string(),
  fromSubsectionId: z.string().nullable().optional(),
  toSubsectionId: z.string().nullable().optional(),
  sourceLabel: z.string(),
  targetLabel: z.string(),
  origin: promptExploderBindingOriginSchema,
});

export type PromptExploderBindingDto = z.infer<typeof promptExploderBindingSchema>;

export const promptExploderSegmentSchema = z.object({
  id: z.string(),
  type: promptExploderSegmentTypeSchema,
  title: z.string(),
  includeInOutput: z.boolean(),
  text: z.string(),
  raw: z.string(),
  code: z.string().nullable(),
  condition: z.string().nullable(),
  listItems: z.array(promptExploderListItemSchema).optional().default([]),
  subsections: z.array(promptExploderSubsectionSchema).optional().default([]),
  paramsText: z.string().optional().default(''),
  paramsObject: z.record(z.string(), z.unknown()).nullable().optional(),
  paramUiControls: z.record(z.string(), promptExploderParamUiControlSchema).optional().default({}),
  paramComments: z.record(z.string(), z.string()).optional().default({}),
  paramDescriptions: z.record(z.string(), z.string()).optional().default({}),
  matchedPatternIds: z.array(z.string()).optional().default([]),
  matchedPatternLabels: z.array(z.string()).optional().default([]),
  matchedSequenceLabels: z.array(z.string()).optional().default([]),
  confidence: z.number(),
});

export type PromptExploderSegmentDto = z.infer<typeof promptExploderSegmentSchema>;

export const promptExploderDocumentSchema = z.object({
  version: z.number().optional(),
  sourcePrompt: z.string().optional(),
  segments: z.array(promptExploderSegmentSchema),
  bindings: z.array(promptExploderBindingSchema),
  reassembledPrompt: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

export type PromptExploderDocumentDto = z.infer<typeof promptExploderDocumentSchema>;

export const promptExploderLearnedTemplateSchema = z.object({
  id: z.string(),
  segmentType: promptExploderSegmentTypeSchema,
  state: z.enum(['draft', 'candidate', 'active', 'disabled']).default('active'),
  title: z.string(),
  normalizedTitle: z.string(),
  anchorTokens: z.array(z.string()),
  sampleText: z.string(),
  approvals: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PromptExploderLearnedTemplateDto = z.infer<typeof promptExploderLearnedTemplateSchema>;

export const promptExploderPatternSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  ruleCount: z.number(),
  rulesJson: z.string(),
});

export type PromptExploderPatternSnapshotDto = z.infer<typeof promptExploderPatternSnapshotSchema>;

export const promptExploderBenchmarkCaseConfigSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  expectedTypes: z.array(promptExploderSegmentTypeSchema),
  minSegments: z.number(),
});

export type PromptExploderBenchmarkCaseConfigDto = z.infer<typeof promptExploderBenchmarkCaseConfigSchema>;

export const promptExploderBenchmarkSuggestionSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  segmentId: z.string(),
  segmentTitle: z.string(),
  segmentType: promptExploderSegmentTypeSchema,
  confidence: z.number(),
  sampleText: z.string(),
  matchedPatternIds: z.array(z.string()),
  suggestedRuleTitle: z.string(),
  suggestedRulePattern: z.string(),
  suggestedSegmentType: promptExploderSegmentTypeSchema,
  suggestedPriority: z.number(),
  suggestedConfidenceBoost: z.number(),
  suggestedTreatAsHeading: z.boolean(),
});

export type PromptExploderBenchmarkSuggestionDto = z.infer<typeof promptExploderBenchmarkSuggestionSchema>;

export const promptExploderOperationModeSchema = z.enum(['rules_only', 'hybrid', 'ai_assisted']);
export type PromptExploderOperationModeDto = z.infer<typeof promptExploderOperationModeSchema>;

export const promptExploderAiProviderSchema = z.enum(['auto', 'ollama', 'openai', 'anthropic', 'gemini']);
export type PromptExploderAiProviderDto = z.infer<typeof promptExploderAiProviderSchema>;

export const promptExploderBenchmarkSuiteSchema = z.enum(['default', 'extended', 'custom']);
export type PromptExploderBenchmarkSuiteDto = z.infer<typeof promptExploderBenchmarkSuiteSchema>;

export const promptExploderCaseResolverCaptureModeSchema = z.enum([
  'rules_only',
  'rules_with_heuristics',
]);
export type PromptExploderCaseResolverCaptureModeDto = z.infer<
  typeof promptExploderCaseResolverCaptureModeSchema
>;

export type PromptExploderPatternRuleMapDto = Record<string, string[]>;

export const promptExploderValidationStackResolutionReasonSchema = z.enum([
  'exact_match',
  'default_scope',
  'scope_fallback',
  'invalid_stack',
]);
export type PromptExploderValidationStackResolutionReasonDto = z.infer<
  typeof promptExploderValidationStackResolutionReasonSchema
>;

export const promptExploderValidationStackResolutionSchema = z.object({
  stack: promptExploderValidationRuleStackSchema,
  scope: promptExploderRuntimeValidationScopeSchema,
  validatorScope: validatorScopeSchema,
  list: validatorPatternListSchema.nullable(),
  usedFallback: z.boolean(),
  reason: promptExploderValidationStackResolutionReasonSchema,
});
export type PromptExploderValidationStackResolutionDto = z.infer<
  typeof promptExploderValidationStackResolutionSchema
>;

export const promptExploderSettingsSchema = z.object({
  version: z.literal(1),
  runtime: z.object({
    ruleProfile: z.enum(['all', 'pattern_pack', 'learned_only']),
    validationRuleStack: z.string(),
    allowValidationStackFallback: z.boolean().default(false),
    caseResolverCaptureMode: promptExploderCaseResolverCaptureModeSchema.default(
      'rules_only'
    ),
    orchestratorEnabled: z.boolean(),
    benchmarkSuite: z.enum(['default', 'extended', 'custom']),
    benchmarkLowConfidenceThreshold: z.number(),
    benchmarkSuggestionLimit: z.number(),
    customBenchmarkCases: z.array(promptExploderBenchmarkCaseConfigSchema),
  }),
  learning: z.object({
    enabled: z.boolean(),
    similarityThreshold: z.number(),
    templateMergeThreshold: z.number(),
    benchmarkSuggestionUpsertTemplates: z.boolean(),
    minApprovalsForMatching: z.number(),
    maxTemplates: z.number(),
    autoActivateLearnedTemplates: z.boolean(),
    templates: z.array(promptExploderLearnedTemplateSchema),
  }),
  ai: z.object({
    operationMode: promptExploderOperationModeSchema,
    provider: promptExploderAiProviderSchema,
    modelId: z.string(),
    fallbackModelId: z.string(),
    temperature: z.number(),
    maxTokens: z.number(),
  }),
  patternSnapshots: z.array(promptExploderPatternSnapshotSchema),
});

export type PromptExploderSettingsDto = z.infer<typeof promptExploderSettingsSchema>;

/**
 * Prompt Exploder Library DTOs
 */

export const promptExploderLibraryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  document: promptExploderDocumentSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PromptExploderLibraryItemDto = z.infer<typeof promptExploderLibraryItemSchema>;

export const promptExploderLibraryStateSchema = z.object({
  version: z.literal(1),
  items: z.array(promptExploderLibraryItemSchema),
});

export type PromptExploderLibraryStateDto = z.infer<typeof promptExploderLibraryStateSchema>;

/**
 * Prompt Exploder Bridge DTOs
 */

export const promptExploderBridgeSourceSchema = z.enum([
  'image-studio',
  'prompt-exploder',
  'case-resolver',
]);
export type PromptExploderBridgeSourceDto = z.infer<typeof promptExploderBridgeSourceSchema>;

export const promptExploderBridgeTargetSchema = z.enum([
  'prompt-exploder',
  'image-studio',
  'case-resolver',
]);
export type PromptExploderBridgeTargetDto = z.infer<typeof promptExploderBridgeTargetSchema>;

export const promptExploderCaseResolverContextSchema = z.object({
  fileId: z.string(),
  fileName: z.string(),
  sessionId: z.string().optional(),
  documentVersionAtStart: z.number().int().nonnegative().optional(),
});
export type PromptExploderCaseResolverContextDto = z.infer<
  typeof promptExploderCaseResolverContextSchema
>;

export const promptExploderCaseResolverPartyRoleSchema = z.enum(['addresser', 'addressee']);
export type PromptExploderCaseResolverPartyRoleDto = z.infer<
  typeof promptExploderCaseResolverPartyRoleSchema
>;

export const promptExploderCaseResolverPartyKindSchema = z.enum(['person', 'organization']);
export type PromptExploderCaseResolverPartyKindDto = z.infer<
  typeof promptExploderCaseResolverPartyKindSchema
>;

export const promptExploderCaseResolverPartyCandidateSchema = z.object({
  role: promptExploderCaseResolverPartyRoleSchema,
  displayName: z.string(),
  rawText: z.string(),
  kind: promptExploderCaseResolverPartyKindSchema.optional(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  organizationName: z.string().optional(),
  street: z.string().optional(),
  streetNumber: z.string().optional(),
  houseNumber: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  sourceSegmentId: z.string().optional(),
  sourceSegmentTitle: z.string().optional(),
  sourcePatternLabels: z.array(z.string()).optional(),
  sourceSequenceLabels: z.array(z.string()).optional(),
});
export type PromptExploderCaseResolverPartyCandidateDto = z.infer<
  typeof promptExploderCaseResolverPartyCandidateSchema
>;

export const promptExploderCaseResolverPartyBundleSchema = z.object({
  addresser: promptExploderCaseResolverPartyCandidateSchema.optional(),
  addressee: promptExploderCaseResolverPartyCandidateSchema.optional(),
});
export type PromptExploderCaseResolverPartyBundleDto = z.infer<
  typeof promptExploderCaseResolverPartyBundleSchema
>;

export const promptExploderCaseResolverPlaceDateSchema = z.object({
  city: z.string().optional(),
  day: z.string().optional(),
  month: z.string().optional(),
  year: z.string().optional(),
  sourceSegmentId: z.string().optional(),
  sourceSegmentTitle: z.string().optional(),
  sourcePatternLabels: z.array(z.string()).optional(),
  sourceSequenceLabels: z.array(z.string()).optional(),
});
export type PromptExploderCaseResolverPlaceDateDto = z.infer<
  typeof promptExploderCaseResolverPlaceDateSchema
>;

export const promptExploderCaseResolverMetadataSchema = z.object({
  placeDate: promptExploderCaseResolverPlaceDateSchema.optional(),
});
export type PromptExploderCaseResolverMetadataDto = z.infer<
  typeof promptExploderCaseResolverMetadataSchema
>;

export const promptExploderBridgePayloadSchema = z.object({
  prompt: z.string(),
  source: promptExploderBridgeSourceSchema,
  target: promptExploderBridgeTargetSchema.optional(),
  caseResolverContext: promptExploderCaseResolverContextSchema.optional(),
  caseResolverParties: promptExploderCaseResolverPartyBundleSchema.optional(),
  caseResolverMetadata: promptExploderCaseResolverMetadataSchema.optional(),
  createdAt: z.string(),
});
export type PromptExploderBridgePayloadDto = z.infer<typeof promptExploderBridgePayloadSchema>;
