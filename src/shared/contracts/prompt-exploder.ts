import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';
import { validatorScopeSchema, validatorPatternListSchema } from './validator';

/**
 * Prompt Exploder Basic DTOs
 */

export const promptExploderSegmentTypeSchema = z.enum([
  'static',
  'dynamic',
  'conditional',
  'list',
  'parameter_block',
  'metadata',
  'sequence',
  'qa_matrix',
  'hierarchical_list',
  'referential_list',
  'conditional_list',
  'assigned_text',
  'prompt_exploder',
]);
export type PromptExploderSegmentType = z.infer<typeof promptExploderSegmentTypeSchema>;

export const promptExploderListItemSchema: z.ZodType<PromptExploderListItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().optional(),
    value: z.string().optional(),
    text: z.string().optional(),
    description: z.string().optional(),
    logicalOperator: promptExploderLogicalOperatorSchema.nullable().optional(),
    logicalConditions: z.array(z.lazy(() => promptExploderLogicalConditionSchema)).default([]),
    referencedParamPath: z.string().nullable().optional(),
    referencedComparator: promptExploderLogicalComparatorSchema.nullable().optional(),
    referencedValue: z.unknown().nullable().optional(),
    children: z.array(promptExploderListItemSchema).default([]),
  })
);

export interface PromptExploderListItem {
  id: string;
  label?: string;
  value?: string;
  text?: string;
  description?: string;
  logicalOperator?: PromptExploderLogicalOperator | null;
  logicalConditions: PromptExploderLogicalCondition[];
  referencedParamPath?: string | null;
  referencedComparator?: PromptExploderLogicalComparator | null;
  referencedValue?: unknown | null;
  children: PromptExploderListItem[];
}

/**
 * Prompt Exploder Logical DTOs
 */

export const promptExploderLogicalOperatorSchema = z.enum(['if', 'only_if', 'unless', 'when']);
export type PromptExploderLogicalOperator = z.infer<typeof promptExploderLogicalOperatorSchema>;

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
export type PromptExploderLogicalComparator = z.infer<typeof promptExploderLogicalComparatorSchema>;

export const promptExploderLogicalJoinSchema = z.enum(['and', 'or']);
export type PromptExploderLogicalJoin = z.infer<typeof promptExploderLogicalJoinSchema>;

export const promptExploderLogicalConditionSchema = z.object({
  id: z.string(),
  paramPath: z.string(),
  comparator: promptExploderLogicalComparatorSchema,
  value: z.unknown().nullable(),
  joinWithPrevious: promptExploderLogicalJoinSchema.nullable().optional(),
});

export type PromptExploderLogicalCondition = z.infer<typeof promptExploderLogicalConditionSchema>;

export const promptExploderLogicalJoinGroupSchema = z.object({
  type: z.enum(['AND', 'OR']), // Legacy if needed, but implementation uses PromptExploderLogicalJoin
  conditions: z.array(z.lazy(() => promptExploderLogicalConditionSchema)),
});

export type PromptExploderLogicalJoinGroup = z.infer<typeof promptExploderLogicalJoinGroupSchema>;

/**
 * Prompt Exploder Document Structure DTOs
 */

export const promptExploderSubsectionSchema: z.ZodType<PromptExploderSubsection> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    segments: z.array(z.lazy(() => promptExploderSegmentSchema)).optional(),
    code: z.string().nullable().optional(),
    items: z.array(z.lazy(() => promptExploderListItemSchema)).optional(),
    condition: z.string().nullable().optional(),
    guidance: z.string().nullable().optional(),
  })
);

export interface PromptExploderSubsection {
  id: string;
  title: string;
  segments?: PromptExploderSegment[];
  code?: string | null;
  items?: PromptExploderListItem[];
  condition?: string | null;
  guidance?: string | null;
}

export const promptExploderBindingTypeSchema = z.enum([
  'text',
  'number',
  'boolean',
  'json',
  'list',
  'depends_on',
  'references',
]);
export type PromptExploderBindingType = z.infer<typeof promptExploderBindingTypeSchema>;

export const promptExploderBindingOriginSchema = z.enum([
  'user',
  'system',
  'learned',
  'inferred',
  'manual',
  'auto',
]);
export type PromptExploderBindingOrigin = z.infer<typeof promptExploderBindingOriginSchema>;

export const promptExploderParamUiControlSchema = z.enum([
  'text',
  'textarea',
  'select',
  'slider',
  'switch',
  'auto',
  'checkbox',
  'buttons',
  'number',
  'json',
  'rgb',
  'tuple2',
]);
export type PromptExploderParamUiControl = z.infer<typeof promptExploderParamUiControlSchema>;

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
  fromSubsectionId: z.string().nullable().optional(),
  toSubsectionId: z.string().nullable().optional(),
  sourceLabel: z.string().optional(),
  targetLabel: z.string().optional(),
});

export type PromptExploderBinding = z.infer<typeof promptExploderBindingSchema>;

export const promptExploderSegmentSchema: z.ZodType<PromptExploderSegment> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: promptExploderSegmentTypeSchema,
    title: z.string().nullable().optional(),
    content: z.string().optional(),
    condition: z.string().nullable().optional(),
    items: z.array(promptExploderListItemSchema).default([]),
    listItems: z.array(promptExploderListItemSchema).default([]),
    subsections: z.array(promptExploderSubsectionSchema).default([]),
    bindingKey: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    raw: z.string().nullable().optional(),
    paramsText: z.string().nullable().optional(),
    paramsObject: z.record(z.string(), z.unknown()).nullable().optional(),
    paramUiControls: z.record(z.string(), promptExploderParamUiControlSchema).default({}),
    paramComments: z.record(z.string(), z.string()).default({}),
    paramDescriptions: z.record(z.string(), z.string()).default({}),
    code: z.string().nullable().optional(),
    includeInOutput: z.boolean().default(true),
    confidence: z.number().default(0),
    matchedPatternIds: z.array(z.string()).default([]),
    matchedPatternLabels: z.array(z.string()).default([]),
    matchedSequenceLabels: z.array(z.string()).default([]),
    isHeading: z.boolean().optional(),
    treatAsHeading: z.boolean().optional(),
    suggestedTreatAsHeading: z.boolean().optional(),
    ruleCount: z.number().optional(),
    ruleStack: z.record(z.string(), z.unknown()).optional(),
    validationResults: z.array(z.string()).default([]),
    bindings: z.record(z.string(), z.unknown()).optional(),
    segments: z.array(promptExploderSegmentSchema).default([]),
  })
);

export interface PromptExploderSegment {
  id: string;
  type: PromptExploderSegmentType;
  title?: string | null;
  content?: string;
  condition?: string | null;
  items: PromptExploderListItem[];
  listItems: PromptExploderListItem[];
  subsections: PromptExploderSubsection[];
  bindingKey?: string | null;
  text?: string | null;
  raw?: string | null;
  paramsText?: string | null;
  paramsObject?: Record<string, unknown> | null;
  paramUiControls: Record<string, PromptExploderParamUiControl>;
  paramComments: Record<string, string>;
  paramDescriptions: Record<string, string>;
  code?: string | null;
  includeInOutput: boolean;
  confidence: number;
  matchedPatternIds: string[];
  matchedPatternLabels: string[];
  matchedSequenceLabels: string[];
  isHeading?: boolean;
  treatAsHeading?: boolean;
  suggestedTreatAsHeading?: boolean;
  ruleCount?: number;
  ruleStack?: Record<string, unknown>;
  validationResults: string[];
  bindings?: Record<string, unknown>;
  segments: PromptExploderSegment[];
}

export const promptExploderDocumentSchema = dtoBaseSchema.extend({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  bindings: z.array(promptExploderBindingSchema).default([]),
  sections: z.array(promptExploderSubsectionSchema).default([]),
  isActive: z.boolean().optional(),
  version: z.number().default(1),
  sourcePrompt: z.string().optional(),
  segments: z.array(promptExploderSegmentSchema).default([]),
  subsections: z.array(promptExploderSubsectionSchema).default([]),
  variables: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  diagnostics: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  reassembledPrompt: z.string().optional(),
  promptLength: z.number().optional(),
  estimatedTokens: z.number().optional(),
  lastReassembledAt: z.string().optional(),
});

export type PromptExploderDocument = z.infer<typeof promptExploderDocumentSchema>;

/**
 * Prompt Exploder Pattern & Template DTOs
 */

export const promptExploderPatternRuleMapSchema = z.record(z.string(), z.array(z.string()));
export type PromptExploderPatternRuleMap = z.infer<typeof promptExploderPatternRuleMapSchema>;

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

export type PromptExploderLearnedTemplate = z.infer<typeof promptExploderLearnedTemplateSchema>;

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

export type PromptExploderPatternSnapshot = z.infer<typeof promptExploderPatternSnapshotSchema>;

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

export type PromptExploderBenchmarkCaseConfig = z.infer<
  typeof promptExploderBenchmarkCaseConfigSchema
>;

export const promptExploderBenchmarkSuiteSchema = namedDtoSchema.extend({
  documentId: z.string(),
  cases: z.array(promptExploderBenchmarkCaseConfigSchema),
});

export type PromptExploderBenchmarkSuite = z.infer<typeof promptExploderBenchmarkSuiteSchema>;

export const promptExploderBenchmarkSuggestionSchema = z.object({
  id: z.string().optional(),
  caseId: z.string(),
  segmentId: z.string().optional(),
  segmentTitle: z.string().nullable().optional(),
  segmentType: z.string().optional(),
  suggestedSegmentType: promptExploderSegmentTypeSchema.default('static'),
  suggestedBindings: z.record(z.string(), z.unknown()).optional(),
  reasoning: z.string().optional(),
  suggestedRulePattern: z.string().default(''),
  suggestedRuleTitle: z.string().default(''),
  suggestedPriority: z.number().default(0),
  suggestedConfidenceBoost: z.number().default(0),
  suggestedTreatAsHeading: z.boolean().default(true),
  sampleText: z.string().default(''),
  confidence: z.number().optional(),
  matchedPatternIds: z.array(z.string()).optional(),
  matchedPatternLabels: z.array(z.string()).optional(),
  matchedSequenceLabels: z.array(z.string()).optional(),
});

export type PromptExploderBenchmarkSuggestion = z.infer<
  typeof promptExploderBenchmarkSuggestionSchema
>;

/**
 * Prompt Exploder Runtime & Settings DTOs
 */

export const promptExploderOperationModeSchema = z.enum([
  'rules_only',
  'hybrid',
  'ai_assisted',
  'manual',
  'semi-auto',
  'automatic',
]);
export type PromptExploderOperationMode = z.infer<typeof promptExploderOperationModeSchema>;

export const promptExploderAiProviderSchema = z.enum([
  'auto',
  'openai',
  'anthropic',
  'google',
  'gemini',
  'ollama',
]);
export type PromptExploderAiProvider = z.infer<typeof promptExploderAiProviderSchema>;

export const promptExploderCaseResolverCaptureModeSchema = z.enum([
  'manual',
  'assisted',
  'fully-auto',
]);
export type PromptExploderCaseResolverCaptureMode = z.infer<
  typeof promptExploderCaseResolverCaptureModeSchema
>;

export const promptExploderValidationRuleStackSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  ruleIds: z.array(z.string()).optional(),
});

export type PromptExploderValidationRuleStack =
  | string
  | z.infer<typeof promptExploderValidationRuleStackSchema>;

export const promptExploderRuntimeValidationScopeSchema = z.enum([
  'segment',
  'document',
  'global',
  'case_resolver_prompt_exploder',
  'prompt_exploder',
]);
export type PromptExploderRuntimeValidationScope = z.infer<
  typeof promptExploderRuntimeValidationScopeSchema
>;

export const promptExploderValidationStackResolutionReasonSchema = z.enum([
  'rule_passed',
  'rule_failed',
  'rule_skipped',
  'exact_match',
  'default_scope',
  'scope_fallback',
  'invalid_stack',
]);
export type PromptExploderValidationStackResolutionReason = z.infer<
  typeof promptExploderValidationStackResolutionReasonSchema
>;

export const promptExploderValidationStackResolutionSchema = z.object({
  stack: z.union([z.string(), promptExploderValidationRuleStackSchema]).optional(),
  stackId: z.string().optional(),
  passed: z.boolean().optional(),
  results: z
    .array(
      z.object({
        ruleId: z.string(),
        passed: z.boolean(),
        reason: promptExploderValidationStackResolutionReasonSchema,
        message: z.string().optional(),
      })
    )
    .optional(),
  usedFallback: z.boolean().optional(),
  scope: promptExploderRuntimeValidationScopeSchema.optional(),
  reason: z.string().optional(),
  validatorScope: validatorScopeSchema.optional(),
  list: validatorPatternListSchema.optional(),
});

export type PromptExploderValidationStackResolution = z.infer<
  typeof promptExploderValidationStackResolutionSchema
>;

export const promptExploderRuntimeRuleProfileSchema = z.enum([
  'all',
  'pattern_pack',
  'learned_only',
]);
export type PromptExploderRuntimeRuleProfile = z.infer<
  typeof promptExploderRuntimeRuleProfileSchema
>;

export const promptExploderCaseResolverExtractionModeSchema = z.enum([
  'rules_only',
  'rules_with_heuristics',
]);
export type PromptExploderCaseResolverExtractionMode = z.infer<
  typeof promptExploderCaseResolverExtractionModeSchema
>;

export const promptExploderSettingsSchema = z.object({
  version: z.number(),
  runtime: z.object({
    ruleProfile: promptExploderRuntimeRuleProfileSchema,
    validationRuleStack: z.string(),
    allowValidationStackFallback: z.boolean().optional(),
    caseResolverCaptureMode: promptExploderCaseResolverExtractionModeSchema.optional(),
    orchestratorEnabled: z.boolean().optional(),
    benchmarkSuite: z.string().optional(),
    benchmarkLowConfidenceThreshold: z.number().optional(),
    benchmarkSuggestionLimit: z.number().optional(),
    customBenchmarkCases: z.array(promptExploderBenchmarkCaseConfigSchema).optional(),
  }),
  learning: z.object({
    enabled: z.boolean(),
    similarityThreshold: z.number(),
    templateMergeThreshold: z.number(),
    benchmarkSuggestionUpsertTemplates: z.boolean().optional(),
    minApprovalsForMatching: z.number(),
    maxTemplates: z.number(),
    autoActivateLearnedTemplates: z.boolean(),
    templates: z.array(z.lazy(() => promptExploderLearnedTemplateSchema)),
  }),
  ai: z.object({
    operationMode: promptExploderOperationModeSchema,
    provider: promptExploderAiProviderSchema,
    modelId: z.string(),
    fallbackModelId: z.string(),
    temperature: z.number(),
    maxTokens: z.number(),
  }),
  patternSnapshots: z.array(z.lazy(() => promptExploderPatternSnapshotSchema)).optional(),
});

export interface PromptExploderSettings {
  version: number;
  runtime: {
    ruleProfile: PromptExploderRuntimeRuleProfile;
    validationRuleStack: PromptExploderValidationRuleStack;
    allowValidationStackFallback?: boolean;
    caseResolverCaptureMode?: PromptExploderCaseResolverExtractionMode;
    orchestratorEnabled?: boolean;
    benchmarkSuite?: string;
    benchmarkLowConfidenceThreshold?: number;
    benchmarkSuggestionLimit?: number;
    customBenchmarkCases?: unknown[];
  };
  learning: {
    enabled: boolean;
    similarityThreshold: number;
    templateMergeThreshold: number;
    benchmarkSuggestionUpsertTemplates?: boolean;
    minApprovalsForMatching: number;
    maxTemplates: number;
    autoActivateLearnedTemplates: boolean;
    templates: PromptExploderLearnedTemplate[];
  };
  ai: {
    operationMode: PromptExploderOperationMode;
    provider: PromptExploderAiProvider;
    modelId: string;
    fallbackModelId: string;
    temperature: number;
    maxTokens: number;
  };
  patternSnapshots?: PromptExploderPatternSnapshot[];
}

/**
 * Case Resolver Capture DTOs
 */

export const promptExploderCaseResolverPartyCandidateSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  score: z.number().optional(),
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

export type PromptExploderCaseResolverPartyCandidate = z.infer<
  typeof promptExploderCaseResolverPartyCandidateSchema
>;
export type PromptExploderCaseResolverPartyCandidateDto = PromptExploderCaseResolverPartyCandidate;

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

export type PromptExploderCaseResolverPartyConfig = z.infer<
  typeof promptExploderCaseResolverPartyConfigSchema
>;

export const promptExploderCaseResolverPartyBundleSchema = z.object({
  addresser: promptExploderCaseResolverPartyCandidateSchema.optional(),
  addressee: promptExploderCaseResolverPartyCandidateSchema.optional(),
  subject: promptExploderCaseResolverPartyCandidateSchema.optional(),
  reference: promptExploderCaseResolverPartyCandidateSchema.optional(),
  other: promptExploderCaseResolverPartyCandidateSchema.optional(),
});

export type PromptExploderCaseResolverPartyBundle = z.infer<
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

export interface PromptExploderCaseResolverPlaceDate {
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

export interface PromptExploderCaseResolverMetadata {
  parties?: PromptExploderCaseResolverPartyBundle | undefined;
  caseId?: string | undefined;
  documentType?: string | undefined;
  placeDate?: PromptExploderCaseResolverPlaceDate | undefined;
}

/**
 * Prompt Exploder Bridge DTOs
 */

export const promptExploderBridgePayloadStatusSchema = z.enum([
  'pending',
  'applied',
  'dismissed',
  'failed',
]);
export type PromptExploderBridgePayloadStatus = z.infer<
  typeof promptExploderBridgePayloadStatusSchema
>;

export const promptExploderBridgeSourceSchema = z.enum([
  'manual',
  'auto',
  'external',
  'draft',
  'template',
  'sequence',
  'qa_matrix',
  'prompt_exploder',
  'prompt-exploder',
  'image-studio',
  'case-resolver',
]);
export type PromptExploderBridgeSource = z.infer<typeof promptExploderBridgeSourceSchema>;

export const promptExploderBridgeTargetSchema = z.enum([
  'studio',
  'image-studio',
  'case-resolver',
  'external',
  'clipboard',
  'file',
  'prompt_exploder',
  'prompt-exploder',
]);
export type PromptExploderBridgeTarget = z.infer<typeof promptExploderBridgeTargetSchema>;

export const promptExploderCaseResolverContextSchema = z.object({
  fileId: z.string().optional(),
  fileName: z.string().optional(),
  sessionId: z.string().optional(),
  documentVersionAtStart: z.number().optional(),
});

export interface PromptExploderCaseResolverContext {
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

export interface PromptExploderBridgePayload {
  prompt: string;
  source: PromptExploderBridgeSource;
  target: PromptExploderBridgeTarget;
  createdAt: string;
  transferId?: string | undefined;
  payloadVersion?: number | undefined;
  expiresAt?: string | undefined;
  status?: PromptExploderBridgePayloadStatus | undefined;
  appliedAt?: string | undefined;
  checksum?: string | undefined;
  caseResolverContext?: PromptExploderCaseResolverContext | undefined;
  caseResolverParties?: PromptExploderCaseResolverPartyBundle | undefined;
  caseResolverMetadata?: PromptExploderCaseResolverMetadata | undefined;
}

export type PromptExploderCaseResolverPartyKind = 'person' | 'organization';
export type PromptExploderCaseResolverPartyRole =
  | 'addresser'
  | 'addressee'
  | 'subject'
  | 'reference'
  | 'other';

/**
 * DTO Aliases for compatibility
 */
export type PromptExploderSegmentTypeDto = PromptExploderSegmentType;
export type PromptExploderListItemDto = PromptExploderListItem;
export type PromptExploderLogicalOperatorDto = PromptExploderLogicalOperator;
export type PromptExploderLogicalComparatorDto = PromptExploderLogicalComparator;
export type PromptExploderLogicalJoinDto = PromptExploderLogicalJoin;
export type PromptExploderLogicalConditionDto = PromptExploderLogicalCondition;
export type PromptExploderLogicalJoinGroupDto = PromptExploderLogicalJoinGroup;
export type PromptExploderSubsectionDto = PromptExploderSubsection;
export type PromptExploderBindingTypeDto = PromptExploderBindingType;
export type PromptExploderBindingOriginDto = PromptExploderBindingOrigin;
export type PromptExploderParamUiControlDto = PromptExploderParamUiControl;
export type PromptExploderBindingDto = PromptExploderBinding;
export type PromptExploderSegmentDto = PromptExploderSegment;
export type PromptExploderDocumentDto = PromptExploderDocument;
export type PromptExploderPatternRuleMapDto = PromptExploderPatternRuleMap;
export type PromptExploderLearnedTemplateDto = PromptExploderLearnedTemplate;
export type PromptExploderPatternSnapshotDto = PromptExploderPatternSnapshot;
export type PromptExploderBenchmarkCaseConfigDto = PromptExploderBenchmarkCaseConfig;
export type PromptExploderBenchmarkSuiteDto = PromptExploderBenchmarkSuite;
export type PromptExploderBenchmarkSuggestionDto = PromptExploderBenchmarkSuggestion;
export type PromptExploderOperationModeDto = PromptExploderOperationMode;
export type PromptExploderAiProviderDto = PromptExploderAiProvider;
export type PromptExploderCaseResolverCaptureModeDto = PromptExploderCaseResolverCaptureMode;
export type PromptExploderSettingsDto = PromptExploderSettings;
export type PromptExploderAiProviderDtoAlias = PromptExploderAiProviderDto;
export type PromptExploderBindingDtoAlias = PromptExploderBindingDto;
export type PromptExploderBindingOriginDtoAlias = PromptExploderBindingOriginDto;
export type PromptExploderBindingTypeDtoAlias = PromptExploderBindingTypeDto;
export type PromptExploderCaseResolverCaptureModeDtoAlias =
  PromptExploderCaseResolverCaptureModeDto;
export type PromptExploderDocumentDtoAlias = PromptExploderDocumentDto;
export type PromptExploderLearnedTemplateDtoAlias = PromptExploderLearnedTemplateDto;
export type PromptExploderListItemDtoAlias = PromptExploderListItemDto;
export type PromptExploderLogicalComparatorDtoAlias = PromptExploderLogicalComparatorDto;
export type PromptExploderLogicalConditionDtoAlias = PromptExploderLogicalConditionDto;
export type PromptExploderLogicalJoinDtoAlias = PromptExploderLogicalJoinDto;
export type PromptExploderLogicalOperatorDtoAlias = PromptExploderLogicalOperatorDto;
export type PromptExploderOperationModeDtoAlias = PromptExploderOperationModeDto;
export type PromptExploderParamUiControlDtoAlias = PromptExploderParamUiControlDto;
export type PromptExploderPatternRuleMapDtoAlias = PromptExploderPatternRuleMapDto;
export type PromptExploderPatternSnapshotDtoAlias = PromptExploderPatternSnapshotDto;
export type PromptExploderSegmentDtoAlias = PromptExploderSegmentDto;
export type PromptExploderSegmentTypeDtoAlias = PromptExploderSegmentTypeDto;
export type PromptExploderSettingsDtoAlias = PromptExploderSettingsDto;
export type PromptExploderSubsectionDtoAlias = PromptExploderSubsectionDto;
export type PromptExploderBenchmarkSuggestionDtoAlias = PromptExploderBenchmarkSuggestionDto;
export type PromptExploderBenchmarkSuiteDtoAlias = PromptExploderBenchmarkSuiteDto;
export type PromptExploderValidationStackResolutionDto = PromptExploderValidationStackResolution;
export type PromptExploderRuntimeValidationScopeDto = PromptExploderRuntimeValidationScope;
export type PromptExploderValidationStackResolutionReasonDto =
  PromptExploderValidationStackResolutionReason;
