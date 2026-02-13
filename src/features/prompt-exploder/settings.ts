import { z } from 'zod';

import type {
  PromptExploderBenchmarkCaseConfig,
  PromptExploderLearnedTemplate,
  PromptExploderPatternSnapshot,
  PromptExploderSegmentType,
  PromptExploderSettings,
} from './types';

export const PROMPT_EXPLODER_SETTINGS_KEY = 'prompt_exploder_settings';

const segmentTypeValues: PromptExploderSegmentType[] = [
  'metadata',
  'assigned_text',
  'list',
  'parameter_block',
  'referential_list',
  'sequence',
  'hierarchical_list',
  'conditional_list',
  'qa_matrix',
];

const learnedTemplateSchema: z.ZodType<PromptExploderLearnedTemplate> = z.object({
  id: z.string().trim().min(1),
  segmentType: z.enum(segmentTypeValues as [PromptExploderSegmentType, ...PromptExploderSegmentType[]]),
  state: z
    .enum(['draft', 'candidate', 'active', 'disabled'])
    .optional()
    .default('active'),
  title: z.string().trim().min(1),
  normalizedTitle: z.string().trim().min(1),
  anchorTokens: z.array(z.string().trim().min(1)).default([]),
  sampleText: z.string().default(''),
  approvals: z.number().int().min(1).default(1),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

const patternSnapshotSchema: z.ZodType<PromptExploderPatternSnapshot> = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  createdAt: z.string().trim().min(1),
  ruleCount: z.number().int().min(0).default(0),
  rulesJson: z.string().trim().min(1),
});

const benchmarkCaseSchema: z.ZodType<PromptExploderBenchmarkCaseConfig> = z.object({
  id: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  expectedTypes: z
    .array(
      z.enum(
        segmentTypeValues as [PromptExploderSegmentType, ...PromptExploderSegmentType[]]
      )
    )
    .min(1),
  minSegments: z.number().int().min(1).max(200).default(1),
});

const promptExploderSettingsSchema: z.ZodType<PromptExploderSettings> = z.object({
  version: z.literal(1),
  runtime: z
    .object({
      ruleProfile: z.enum(['all', 'pattern_pack', 'learned_only']).default('all'),
      benchmarkSuite: z.enum(['default', 'extended', 'custom']).default('default'),
      benchmarkLowConfidenceThreshold: z.number().min(0.3).max(0.9).default(0.55),
      benchmarkSuggestionLimit: z.number().int().min(1).max(20).default(4),
      customBenchmarkCases: z.array(benchmarkCaseSchema).default([]),
    })
    .optional()
    .default({
      ruleProfile: 'all',
      benchmarkSuite: 'default',
      benchmarkLowConfidenceThreshold: 0.55,
      benchmarkSuggestionLimit: 4,
      customBenchmarkCases: [],
    }),
  learning: z.object({
    enabled: z.boolean().default(true),
    similarityThreshold: z.number().min(0.3).max(0.95).default(0.68),
    minApprovalsForMatching: z.number().int().min(1).max(20).default(1),
    maxTemplates: z.number().int().min(50).max(5000).default(1000),
    autoActivateLearnedTemplates: z.boolean().default(true),
    templates: z.array(learnedTemplateSchema).default([]),
  }),
  patternSnapshots: z.array(patternSnapshotSchema).optional().default([]),
});

export const defaultPromptExploderSettings: PromptExploderSettings = {
  version: 1,
  runtime: {
    ruleProfile: 'all',
    benchmarkSuite: 'default',
    benchmarkLowConfidenceThreshold: 0.55,
    benchmarkSuggestionLimit: 4,
    customBenchmarkCases: [],
  },
  learning: {
    enabled: true,
    similarityThreshold: 0.68,
    minApprovalsForMatching: 1,
    maxTemplates: 1000,
    autoActivateLearnedTemplates: true,
    templates: [],
  },
  patternSnapshots: [],
};

export function parsePromptExploderSettings(rawValue: string | null | undefined): PromptExploderSettings {
  if (!rawValue?.trim()) return defaultPromptExploderSettings;

  try {
    const parsed: unknown = JSON.parse(rawValue);
    const result = promptExploderSettingsSchema.safeParse(parsed);
    if (!result.success) return defaultPromptExploderSettings;
    return {
      ...result.data,
      learning: {
        ...result.data.learning,
        templates: result.data.learning.templates.map((template) => ({
          ...template,
          state: template.state ?? 'active',
        })),
      },
    };
  } catch {
    return defaultPromptExploderSettings;
  }
}
