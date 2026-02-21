import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Prompt Exploder Basic DTOs
 */

export const promptExploderSegmentTypeSchema = z.enum(['static', 'dynamic', 'conditional', 'list', 'parameter_block', 'metadata', 'sequence', 'qa_matrix', 'hierarchical_list', 'referential_list', 'conditional_list', 'assigned_text', 'prompt_exploder']);
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

export const promptExploderBindingOriginSchema = z.enum(['user', 'system', 'learned', 'inferred', 'manual', 'auto']);
export type PromptExploderBindingOriginDto = z.infer<typeof promptExploderBindingOriginSchema>;
export type PromptExploderBindingOrigin = PromptExploderBindingOriginDto;

export const promptExploderParamUiControlSchema = z.enum(['text', 'textarea', 'select', 'slider', 'switch']);
export type PromptExploderParamUiControlDto = z.infer<typeof promptExploderParamUiControlSchema>;
export type PromptExploderParamUiControl = PromptExploderParamUiControlDto;

export const promptExploderBindingSchema = z.object({
  key: z.string().optional(),
  type: z.union([promptExploderBindingTypeSchema, z.string()]).optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
  uiControl: promptExploderParamUiControlSchema.optional(),
  options: z.array(promptExploderListItemSchema).optional(),
  origin: promptExploderBindingOriginSchema.optional(),
  id: z.string().optional(),
  fromSegmentId: z.string().optional(),
  toSegmentId: z.string().optional(),
  sourceLabel: z.string().optional(),
  targetLabel: z.string().optional(),
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
  isHeading: z.boolean().optional(),
  treatAsHeading: z.boolean().optional(),
  suggestedTreatAsHeading: z.boolean().optional(),
  ruleCount: z.number().optional(),
  ruleStack: z.record(z.string(), z.unknown()).optional(),
  validationResults: z.array(z.any()).optional(),
  bindings: z.record(z.string(), z.unknown()).optional(),
  segments: z.array(z.any()).optional(),
});

export type PromptExploderSegmentDto = z.infer<typeof promptExploderSegmentSchema>;
export type PromptExploderSegment = PromptExploderSegmentDto;

export const promptExploderDocumentSchema = dtoBaseSchema.extend({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  bindings: z.array(promptExploderBindingSchema).optional(),
  sections: z.array(promptExploderSubsectionSchema).optional(),
  isActive: z.boolean().optional(),
  version: z.number().optional(),
  sourcePrompt: z.string().optional(),
  segments: z.array(z.any()).optional(),
  subsections: z.array(z.any()).optional(),
  variables: z.array(z.any()).optional(),
  dependencies: z.array(z.any()).optional(),
  rules: z.array(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  warnings: z.array(z.any()).optional(),
  errors: z.array(z.any()).optional(),
  diagnostics: z.array(z.any()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  reassembledPrompt: z.string().optional(),
  promptLength: z.number().optional(),
  estimatedTokens: z.number().optional(),
  lastReassembledAt: z.string().optional(),
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
  pattern: z.string().optional(),
  title: z.string().optional(),
  normalizedTitle: z.string().optional(),
  anchorTokens: z.array(z.string()).optional(),
  sampleText: z.string().optional(),
  approvals: z.union([z.number(), z.record(z.string(), z.unknown())]).optional(),
  segmentType: promptExploderSegmentTypeSchema.optional(),
  usageCount: z.number().optional(),
  lastUsedAt: z.string().optional(),
  state: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PromptExploderLearnedTemplateDto = z.infer<typeof promptExploderLearnedTemplateSchema>;
export type PromptExploderLearnedTemplate = PromptExploderLearnedTemplateDto;

export const promptExploderPatternSnapshotSchema = z.object({
  id: z.string(),
  timestamp: z.string().optional(),
  bindings: z.record(z.string(), z.unknown()).optional(),
  result: z.string().optional(),
  name: z.string().optional(),
  ruleCount: z.number().optional(),
  rulesJson: z.string().optional(),
  createdAt: z.string().optional(),
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
  matchedPatternLabels: z.array(z.string()).optional(),
  matchedSequenceLabels: z.array(z.string()).optional(),
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
  id: z.string().optional(),
  name: z.string().optional(),
  ruleIds: z.array(z.string()).optional(),
});

export type PromptExploderValidationRuleStackDto = z.infer<typeof promptExploderValidationRuleStackSchema>;
export type PromptExploderValidationRuleStack = string; // Always a string ID in runtime logic

export const promptExploderRuntimeValidationScopeSchema = z.enum(['segment', 'document', 'global', 'case_resolver_prompt_exploder', 'prompt_exploder']);
export type PromptExploderRuntimeValidationScopeDto = z.infer<typeof promptExploderRuntimeValidationScopeSchema>;
export type PromptExploderRuntimeValidationScope = PromptExploderRuntimeValidationScopeDto;

export const promptExploderValidationStackResolutionReasonSchema = z.enum(['rule_passed', 'rule_failed', 'rule_skipped', 'exact_match', 'default_scope', 'scope_fallback', 'invalid_stack']);
export type PromptExploderValidationStackResolutionReasonDto = z.infer<typeof promptExploderValidationStackResolutionReasonSchema>;
export type PromptExploderValidationStackResolutionReason = PromptExploderValidationStackResolutionReasonDto;

export const promptExploderValidationStackResolutionSchema = z.object({
  stack: z.union([z.string(), promptExploderValidationRuleStackSchema]).optional(),
  stackId: z.string().optional(),
  passed: z.boolean().optional(),
  results: z.array(z.object({
    ruleId: z.string(),
    passed: z.boolean(),
    reason: promptExploderValidationStackResolutionReasonSchema,
    message: z.string().optional(),
  })).optional(),
  usedFallback: z.boolean().optional(),
  scope: promptExploderRuntimeValidationScopeSchema.optional(),
  reason: z.string().optional(),
  validatorScope: z.string().optional(),
  list: z.any().optional(),
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

/**
 * Case Resolver Capture DTOs
 */

export const promptExploderCaseResolverPartyCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  score: z.number(),
  kind: z.enum(['person', 'organization']).optional(),
  role: z.string().optional(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  organizationName: z.string().optional(),
  displayName: z.string().optional(),
  rawText: z.string().optional(),
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
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export interface PromptExploderCaseResolverPartyCandidateDto {
  id: string;
  name: string;
  score: number;
  kind?: 'person' | 'organization' | undefined;
  role?: string | undefined;
  firstName?: string | undefined;
  middleName?: string | undefined;
  lastName?: string | undefined;
  organizationName?: string | undefined;
  displayName?: string | undefined;
  rawText?: string | undefined;
  street?: string | undefined;
  streetNumber?: string | undefined;
  houseNumber?: string | undefined;
  city?: string | undefined;
  postalCode?: string | undefined;
  country?: string | undefined;
  sourceSegmentId?: string | undefined;
  sourceSegmentTitle?: string | undefined;
  sourcePatternLabels?: string[] | undefined;
  sourceSequenceLabels?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export const promptExploderCaseResolverPartyConfigSchema = z.object({
  role: z.enum(['other', 'reference', 'addresser', 'addressee', 'subject']),
  targetPath: z.string(),
  required: z.boolean(),
  enabled: z.boolean().optional(),
  targetRole: z.string().optional(),
  defaultAction: z.string().optional(),
  autoMatchPartyReference: z.boolean().optional(),
  autoMatchAddress: z.boolean().optional(),
  candidates: z.array(promptExploderCaseResolverPartyCandidateSchema).optional(),
});

export type PromptExploderCaseResolverPartyConfigDto = z.infer<typeof promptExploderCaseResolverPartyConfigSchema>;

export const promptExploderCaseResolverPartyBundleSchema = z.object({
  addresser: promptExploderCaseResolverPartyCandidateSchema.optional(),
  addressee: promptExploderCaseResolverPartyCandidateSchema.optional(),
  subject: promptExploderCaseResolverPartyCandidateSchema.optional(),
  reference: promptExploderCaseResolverPartyCandidateSchema.optional(),
  other: promptExploderCaseResolverPartyCandidateSchema.optional(),
});

export type PromptExploderCaseResolverPartyBundleDto = z.infer<typeof promptExploderCaseResolverPartyBundleSchema>;

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

export interface PromptExploderCaseResolverPlaceDateDto {
  city?: string | undefined;
  day?: string | undefined;
  month?: string | undefined;
  year?: string | undefined;
  sourceSegmentId?: string | undefined;
  sourceSegmentTitle?: string | undefined;
  sourcePatternLabels?: string[] | undefined;
  sourceSequenceLabels?: string[] | undefined;
}

export const promptExploderCaseResolverMetadataSchema = z.object({
  parties: promptExploderCaseResolverPartyBundleSchema.optional(),
  caseId: z.string().optional(),
  documentType: z.string().optional(),
  placeDate: promptExploderCaseResolverPlaceDateSchema.optional(),
});

export interface PromptExploderCaseResolverMetadataDto {
  parties?: PromptExploderCaseResolverPartyBundleDto | undefined;
  caseId?: string | undefined;
  documentType?: string | undefined;
  placeDate?: PromptExploderCaseResolverPlaceDateDto | undefined;
}

/**
 * Prompt Exploder Bridge DTOs
 */

export const promptExploderBridgePayloadStatusSchema = z.enum(['pending', 'applied', 'dismissed', 'failed']);
export type PromptExploderBridgePayloadStatusDto = z.infer<typeof promptExploderBridgePayloadStatusSchema>;

export const promptExploderBridgeSourceSchema = z.enum(['manual', 'auto', 'external', 'draft', 'template', 'sequence', 'qa_matrix', 'prompt_exploder']);
export type PromptExploderBridgeSourceDto = z.infer<typeof promptExploderBridgeSourceSchema>;

export const promptExploderBridgeTargetSchema = z.enum(['studio', 'case-resolver', 'external', 'clipboard', 'file', 'prompt_exploder']);
export type PromptExploderBridgeTargetDto = z.infer<typeof promptExploderBridgeTargetSchema>;

export const promptExploderCaseResolverContextSchema = z.object({
  fileId: z.string().optional(),
  fileName: z.string().optional(),
  sessionId: z.string().optional(),
  documentVersionAtStart: z.number().optional(),
});

export interface PromptExploderCaseResolverContextDto {
  fileId?: string | undefined;
  fileName?: string | undefined;
  sessionId?: string | undefined;
  documentVersionAtStart?: number | undefined;
}

export const promptExploderBridgePayloadSchema = z.object({
  prompt: z.string(),
  source: promptExploderBridgeSourceSchema,
  target: promptExploderBridgeTargetSchema,
  createdAt: z.string(),
  transferId: z.string().optional(),
  payloadVersion: z.number().optional(),
  expiresAt: z.string().optional(),
  status: promptExploderBridgePayloadStatusSchema.optional(),
  appliedAt: z.string().optional(),
  checksum: z.string().optional(),
  caseResolverContext: promptExploderCaseResolverContextSchema.optional(),
  caseResolverParties: promptExploderCaseResolverPartyBundleSchema.optional(),
  caseResolverMetadata: promptExploderCaseResolverMetadataSchema.optional(),
});

export interface PromptExploderBridgePayloadDto {
  prompt: string;
  source: PromptExploderBridgeSourceDto;
  target: PromptExploderBridgeTargetDto;
  createdAt: string;
  transferId?: string | undefined;
  payloadVersion?: number | undefined;
  expiresAt?: string | undefined;
  status?: PromptExploderBridgePayloadStatusDto | undefined;
  appliedAt?: string | undefined;
  checksum?: string | undefined;
  caseResolverContext?: PromptExploderCaseResolverContextDto | undefined;
  caseResolverParties?: PromptExploderCaseResolverPartyBundleDto | undefined;
  caseResolverMetadata?: PromptExploderCaseResolverMetadataDto | undefined;
}

export type PromptExploderCaseResolverPartyKindDto = 'person' | 'organization';
export type PromptExploderCaseResolverPartyRoleDto = 'addresser' | 'addressee' | 'subject' | 'reference' | 'other';
