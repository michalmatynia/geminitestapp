import { z } from 'zod';

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
  type: z.enum(['AND', 'OR']),
  conditions: z.array(z.lazy(() => promptExploderLogicalConditionSchema)),
});

export type PromptExploderLogicalJoinGroup = z.infer<typeof promptExploderLogicalJoinGroupSchema>;

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
