import { z } from 'zod';

import { validatorScopeSchema, validatorPatternListSchema } from '../validator';
import { type PromptValidationRule, type PromptEngineSettings } from '../prompt-engine';
import {
  promptExploderSegmentTypeSchema,
  type PromptExploderSegmentType,
} from './base';
import { type PromptExploderBenchmarkCase } from './benchmark';

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
  name: z.string(),
  description: z.string().nullable().optional(),
  rulesJson: z.string().optional(),
  templatesJson: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PromptExploderPatternSnapshot = z.infer<typeof promptExploderPatternSnapshotSchema> & {
  rules?: PromptValidationRule[];
  templates?: PromptExploderLearnedTemplate[];
};

export const promptExploderOperationModeSchema = z.enum(['rules_only', 'hybrid', 'ai_assisted']);
export type PromptExploderOperationMode = z.infer<typeof promptExploderOperationModeSchema>;

export const promptExploderSettingsSchema = z.object({
  mode: promptExploderOperationModeSchema.default('hybrid'),
  validatorScope: validatorScopeSchema.optional(),
  patternLists: z.array(validatorPatternListSchema).default([]),
  activePatternIds: z.array(z.string()).default([]),
  learning: z
    .object({
      enabled: z.boolean().default(true),
      autoActivate: z.boolean().default(false),
      templates: z.array(promptExploderLearnedTemplateSchema).default([]),
      similarityThreshold: z.number().min(0).max(1).default(0.85),
      minApprovals: z.number().int().min(1).default(1),
    })
    .default({}),
  patternSnapshots: z.array(promptExploderPatternSnapshotSchema).default([]),
});

export type PromptExploderSettings = z.infer<typeof promptExploderSettingsSchema>;

export const PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS = [
  'segment.boundary.hr_line',
  'segment.boundary.final_qa',
  'segment.not_heading.rule_line',
  'segment.subsection.alpha_heading',
  'segment.subsection.reference_named',
  'segment.subsection.reference_plain',
  'segment.subsection.qa_code',
  'segment.subsection.numeric_bracket_heading',
  'segment.subsection.bracket_heading',
  'segment.subsection.markdown_heading',
] as const;

export type PromptExploderParserTuningRuleId =
  (typeof PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS)[number];

export type PromptExploderParserTuningRuleDraft = {
  id: PromptExploderParserTuningRuleId;
  label: string;
  title: string;
  description: string | null;
  pattern: string;
  flags: string;
  enabled: boolean;
  promptExploderSegmentType: PromptExploderSegmentType | null;
  promptExploderPriority: number;
  promptExploderConfidenceBoost: number;
  promptExploderTreatAsHeading: boolean;
};

export type PromptExploderValidationRuleStack = {
  id: string;
  name: string;
  rules: PromptValidationRule[];
  isCustom?: boolean;
};

export type ParseCustomBenchmarkCasesResult =
  | { ok: true; cases: PromptExploderBenchmarkCase[] }
  | { ok: false; error: string };

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
