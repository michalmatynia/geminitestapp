import { z } from 'zod';

/**
 * Prompt Exploder Core DTOs (shared to break circular dependencies)
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

export const promptExploderRuntimeValidationScopeSchema = z.enum([
  'prompt_exploder',
  'case_resolver_prompt_exploder',
]);
export type PromptExploderRuntimeValidationScope = z.infer<
  typeof promptExploderRuntimeValidationScopeSchema
>;

export const promptExploderValidationRuleStackSchema = z.string().trim().min(1);
export type PromptExploderValidationRuleStack = z.infer<
  typeof promptExploderValidationRuleStackSchema
>;
