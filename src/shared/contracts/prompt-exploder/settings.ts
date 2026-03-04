import { z } from 'zod';

import {
  validatorScopeSchema,
  validatorPatternListSchema,
  type ValidatorPatternList,
  type ValidatorScope,
} from '../validator';
import { type PromptValidationRule, type PromptEngineSettings } from '../prompt-engine';
import {
  promptExploderSegmentTypeSchema,
  type PromptExploderSegmentType,
} from './base';

export const PROMPT_EXPLODER_SETTINGS_KEY = 'prompt_exploder_settings';
export const VALIDATOR_PATTERN_LISTS_KEY = 'validator_pattern_lists';

/**
 * Prompt Exploder Pattern & Template DTOs
 */

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
  description: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
});

export type PromptExploderPatternSnapshot = z.infer<typeof promptExploderPatternSnapshotSchema> & {
  rules?: PromptValidationRule[];
  templates?: PromptExploderLearnedTemplate[];
};

export const promptExploderOperationModeSchema = z.enum(['rules_only', 'hybrid', 'ai_assisted']);
export type PromptExploderOperationMode = z.infer<typeof promptExploderOperationModeSchema>;

export const promptExploderCaseResolverCaptureModeSchema = z.enum([
  'manual',
  'assisted',
  'fully-auto',
]);
export type PromptExploderCaseResolverCaptureMode = z.infer<
  typeof promptExploderCaseResolverCaptureModeSchema
>;

export const promptExploderCaseResolverExtractionModeSchema = z.enum([
  'rules_only',
  'rules_with_heuristics',
]);
export type PromptExploderCaseResolverExtractionMode = z.infer<
  typeof promptExploderCaseResolverExtractionModeSchema
>;

export const promptExploderRuntimeRuleProfileSchema = z.enum([
  'all',
  'pattern_pack',
  'learned_only',
]);
export type PromptExploderRuntimeRuleProfile = z.infer<
  typeof promptExploderRuntimeRuleProfileSchema
>;

export const promptExploderSettingsSchema = z.object({
  version: z.number().default(1),
  mode: promptExploderOperationModeSchema.default('hybrid'),
  validatorScope: validatorScopeSchema.optional(),
  patternLists: z.array(validatorPatternListSchema).default([]),
  activePatternIds: z.array(z.string()).default([]),
  runtime: z
    .object({
      ruleProfile: promptExploderRuntimeRuleProfileSchema.default('all'),
      validationRuleStack: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
      allowValidationStackFallback: z.boolean().optional(),
      caseResolverCaptureMode: promptExploderCaseResolverExtractionModeSchema.optional(),
      orchestratorEnabled: z.boolean().optional(),
      benchmarkSuite: z.string().optional(),
      benchmarkLowConfidenceThreshold: z.number().optional(),
      benchmarkSuggestionLimit: z.number().optional(),
      customBenchmarkCases: z.union([z.string(), z.array(z.unknown())]).default([]),
    })
    .default({
      ruleProfile: 'all',
      customBenchmarkCases: [],
    }),
  learning: z
    .object({
      enabled: z.boolean().default(true),
      autoActivate: z.boolean().default(false),
      templates: z.array(promptExploderLearnedTemplateSchema).default([]),
      similarityThreshold: z.number().min(0).max(1).default(0.85),
      templateMergeThreshold: z.number().min(0).max(1).default(0.9),
      minApprovals: z.number().int().min(1).default(1),
      minApprovalsForMatching: z.number().int().min(1).default(1),
      maxTemplates: z.number().int().min(1).default(1000),
      autoActivateLearnedTemplates: z.boolean().default(false),
      benchmarkSuggestionUpsertTemplates: z.boolean().default(true),
    })
    .default({
      enabled: true,
      autoActivate: false,
      templates: [],
      similarityThreshold: 0.85,
      templateMergeThreshold: 0.9,
      minApprovals: 1,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
      autoActivateLearnedTemplates: false,
      benchmarkSuggestionUpsertTemplates: true,
    }),
  ai: z
    .object({
      operationMode: promptExploderOperationModeSchema.default('hybrid'),
    })
    .default({
      operationMode: 'hybrid',
    }),
  promptValidation: z.any().optional(),
  patternSnapshots: z.array(promptExploderPatternSnapshotSchema).default([]),
});

export type PromptExploderSettings = z.infer<typeof promptExploderSettingsSchema>;

export const promptExploderRuntimeValidationScopeSchema = z.enum([
  'prompt_exploder',
  'case_resolver_prompt_exploder',
  'global',
  'segment',
  'document',
]);
export type PromptExploderRuntimeValidationScope = z.infer<
  typeof promptExploderRuntimeValidationScopeSchema
>;

export const promptExploderValidationRuleStackSchema = z.union([
  z.string().trim().min(1),
  z.object({
    id: z.string().trim().min(1),
    name: z.string().optional(),
    rules: z.array(z.unknown()).optional(),
    ruleIds: z.array(z.string()).optional(),
    isCustom: z.boolean().optional(),
  }),
]);
export type PromptExploderValidationRuleStack =
  | string
  | {
      id: string;
      name?: string;
      rules?: PromptValidationRule[];
      ruleIds?: string[];
      isCustom?: boolean;
    };

export type PromptExploderValidationRuleStackOption = {
  id: string;
  name: string;
  value: PromptExploderValidationRuleStack;
  label: string;
  description: string;
  scope: ValidatorScope;
  ruleCount?: number;
};

export const promptExploderValidationStackResolutionReasonSchema = z.enum([
  'exact_match',
  'default_scope',
  'scope_fallback',
  'invalid_stack',
  'rule_passed',
  'rule_failed',
  'rule_skipped',
]);
export type PromptExploderValidationStackResolutionReason = z.infer<
  typeof promptExploderValidationStackResolutionReasonSchema
>;

export type PromptExploderValidationStackResolution = {
  stack: PromptExploderValidationRuleStack;
  scope: PromptExploderRuntimeValidationScope;
  validatorScope: ValidatorScope;
  list?: ValidatorPatternList;
  usedFallback: boolean;
  reason: PromptExploderValidationStackResolutionReason;
  passed?: boolean;
  stackId?: string;
};

export type TemplateMergeMode = 'auto' | 'new' | 'target';
export type TemplateUpsertErrorCode = 'TARGET_TEMPLATE_NOT_FOUND' | 'TARGET_TEMPLATE_TYPE_MISMATCH';

export type TemplateSimilarityMatch = {
  template: PromptExploderLearnedTemplate;
  score: number;
};

export type TemplateUpsertResult =
  | {
      ok: true;
      nextTemplates: PromptExploderLearnedTemplate[];
      nextTemplate: PromptExploderLearnedTemplate;
      existingTemplate: PromptExploderLearnedTemplate | null;
      exactTemplate: PromptExploderLearnedTemplate | null;
      targetedTemplate: PromptExploderLearnedTemplate | null;
      similarTemplateMatch: TemplateSimilarityMatch | null;
      mergeMessage: string;
      mergeOutcome: 'forced_new' | 'selected_target' | 'exact' | 'similar' | 'created';
    }
  | {
      ok: false;
      errorCode: TemplateUpsertErrorCode;
      errorMessage: string;
    };

export type CreateTemplateIdArgs = {
  segmentType: PromptExploderSegmentType;
  title: string;
  existingTemplateIds: Set<string>;
};

export type UpsertLearnedTemplateArgs = {
  templates: PromptExploderLearnedTemplate[];
  segmentType: PromptExploderSegmentType;
  title: string;
  sourceText: string;
  sampleText: string;
  similarityThreshold: number;
  minApprovalsForMatching: number;
  autoActivateLearnedTemplates: boolean;
  mergeMode?: TemplateMergeMode;
  targetTemplateId?: string | null;
  now?: string;
  createTemplateId?: (args: CreateTemplateIdArgs) => string;
};

export type PromptExploderPatternPackResult = {
  nextSettings: PromptEngineSettings;
  addedRuleIds: string[];
  updatedRuleIds: string[];
};
