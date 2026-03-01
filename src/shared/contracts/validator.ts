import { z } from 'zod';
import { dtoBaseSchema } from './base';

export const validatorScopeSchema = z.enum([
  'products',
  'image-studio',
  'prompt-exploder',
  'case-resolver-prompt-exploder',
  'case-resolver-plain-text',
  'ai-paths',
]);

export type ValidatorScope = z.infer<typeof validatorScopeSchema>;

export const validatorPatternListSchema = dtoBaseSchema.extend({
  name: z.string(),
  description: z.string(),
  scope: validatorScopeSchema,
  deletionLocked: z.boolean(),
  patterns: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export type ValidatorPatternList = z.infer<typeof validatorPatternListSchema>;
export type ValidatorPatternListDto = ValidatorPatternList;

export const VALIDATOR_PATTERN_LISTS_KEY = 'validator_pattern_lists';

export const VALIDATOR_SCOPE_LABELS: Record<ValidatorScope, string> = {
  products: 'Products',
  'image-studio': 'Image Studio',
  'prompt-exploder': 'Prompt Exploder',
  'case-resolver-prompt-exploder': 'Case Resolver (Prompt)',
  'case-resolver-plain-text': 'Case Resolver (Plain)',
  'ai-paths': 'AI Paths',
};

export const VALIDATOR_SCOPE_DESCRIPTIONS: Record<ValidatorScope, string> = {
  products: 'Standard product field validations.',
  'image-studio': 'Image generation and analysis prompts.',
  'prompt-exploder': 'Complex prompt structural integrity.',
  'case-resolver-prompt-exploder': 'Legal case prompt validation.',
  'case-resolver-plain-text': 'Raw text document extraction.',
  'ai-paths': 'Node connectivity and data flow.',
};

const DEFAULT_VALIDATOR_PATTERN_LIST_DEFS: ReadonlyArray<{
  id: string;
  name: string;
  description: string;
  scope: ValidatorScope;
}> = [
  {
    id: 'products',
    name: 'Product Patterns',
    description: VALIDATOR_SCOPE_DESCRIPTIONS['products'],
    scope: 'products',
  },
  {
    id: 'image-studio',
    name: 'Image Studio Patterns',
    description: VALIDATOR_SCOPE_DESCRIPTIONS['image-studio'],
    scope: 'image-studio',
  },
  {
    id: 'prompt-exploder',
    name: 'Image Studio - Prompt Exploder',
    description: VALIDATOR_SCOPE_DESCRIPTIONS['prompt-exploder'],
    scope: 'prompt-exploder',
  },
  {
    id: 'case-resolver-prompt-exploder',
    name: 'Case Resolver - Prompt Exploder',
    description: VALIDATOR_SCOPE_DESCRIPTIONS['case-resolver-prompt-exploder'],
    scope: 'case-resolver-prompt-exploder',
  },
  {
    id: 'case-resolver-plain-text',
    name: 'Case Resolver - Plain Text',
    description: VALIDATOR_SCOPE_DESCRIPTIONS['case-resolver-plain-text'],
    scope: 'case-resolver-plain-text',
  },
  {
    id: 'ai-paths',
    name: 'AI Paths Patterns',
    description: VALIDATOR_SCOPE_DESCRIPTIONS['ai-paths'],
    scope: 'ai-paths',
  },
];

const buildDefaultValidatorPatternLists = (): ValidatorPatternList[] => {
  const now = new Date().toISOString();
  return DEFAULT_VALIDATOR_PATTERN_LIST_DEFS.map((entry) => ({
    id: entry.id,
    name: entry.name,
    description: entry.description,
    scope: entry.scope,
    deletionLocked: true,
    patterns: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
};

export const parseValidatorPatternLists = (value: unknown): ValidatorPatternList[] => {
  const defaults = buildDefaultValidatorPatternLists();
  if (!value) return defaults;
  try {
    const raw = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
    const candidate = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object' && Array.isArray((raw as { lists?: unknown }).lists)
        ? (raw as { lists: unknown[] }).lists
        : null;
    if (!candidate) return defaults;
    const result = z.array(validatorPatternListSchema).safeParse(candidate);
    if (!result.success || result.data.length === 0) return defaults;
    return result.data;
  } catch {
    return defaults;
  }
};
