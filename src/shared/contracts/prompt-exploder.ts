import { z } from 'zod';

import { promptExploderSegmentTypeSchema, promptValidationRuleSchema } from './prompt-engine';

/**
 * Prompt Exploder DTOs
 */

export const promptExploderLogicalOperatorSchema = z.enum(['if', 'only_if', 'unless', 'when']);
export type PromptExploderLogicalOperatorDto = z.infer<typeof promptExploderLogicalOperatorSchema>;

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
  logicalOperator?: PromptExploderLogicalOperatorDto | null;
  logicalConditions?: PromptExploderLogicalConditionDto[];
  referencedParamPath?: string | null;
  referencedComparator?: PromptExploderLogicalComparatorDto | null;
  referencedValue?: unknown;
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
  listItems: z.array(promptExploderListItemSchema),
  subsections: z.array(promptExploderSubsectionSchema),
  paramsText: z.string(),
  paramsObject: z.record(z.string(), z.unknown()).nullable(),
  paramUiControls: z.record(promptExploderParamUiControlSchema).optional(),
  paramComments: z.record(z.string()).optional(),
  paramDescriptions: z.record(z.string()).optional(),
  matchedPatternIds: z.array(z.string()),
  matchedPatternLabels: z.array(z.string()).optional(),
  matchedSequenceLabels: z.array(z.string()).optional(),
  confidence: z.number(),
});

export type PromptExploderSegmentDto = z.infer<typeof promptExploderSegmentSchema>;

export const promptExploderDocumentSchema = z.object({
  version: z.literal(1),
  sourcePrompt: z.string(),
  segments: z.array(promptExploderSegmentSchema),
  bindings: z.array(promptExploderBindingSchema),
  warnings: z.array(z.string()),
  reassembledPrompt: z.string(),
});

export type PromptExploderDocumentDto = z.infer<typeof promptExploderDocumentSchema>;

export const promptExploderLearnedTemplateSchema = z.object({
  id: z.string(),
  segmentType: promptExploderSegmentTypeSchema,
  state: z.enum(['draft', 'candidate', 'active', 'disabled']),
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

export const promptExploderBenchmarkSuiteSchema = z.enum(['default', 'extended', 'custom']);
export type PromptExploderBenchmarkSuiteDto = z.infer<typeof promptExploderBenchmarkSuiteSchema>;

export const promptExploderBenchmarkCaseConfigSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  expectedTypes: z.array(promptExploderSegmentTypeSchema),
  minSegments: z.number(),
});

export type PromptExploderBenchmarkCaseConfigDto = z.infer<typeof promptExploderBenchmarkCaseConfigSchema>;

export const promptExploderOperationModeSchema = z.enum(['rules_only', 'hybrid', 'ai_assisted']);
export type PromptExploderOperationModeDto = z.infer<typeof promptExploderOperationModeSchema>;

export const promptExploderAiProviderSchema = z.enum(['auto', 'ollama', 'openai', 'anthropic', 'gemini']);
export type PromptExploderAiProviderDto = z.infer<typeof promptExploderAiProviderSchema>;

export const promptExploderSettingsSchema = z.object({
  version: z.literal(1),
  runtime: z.object({
    ruleProfile: z.enum(['all', 'pattern_pack', 'learned_only']),
    validationRuleStack: z.any(), // Keeping as any for now due to complexity in validation-stack
    orchestratorEnabled: z.boolean(),
    benchmarkSuite: promptExploderBenchmarkSuiteSchema,
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
