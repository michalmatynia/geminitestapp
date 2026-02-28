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

export const parseValidatorPatternLists = (value: unknown): ValidatorPatternList[] => {
  if (!value) return [];
  try {
    const raw = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
    const result = z.array(validatorPatternListSchema).safeParse(raw);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
};
