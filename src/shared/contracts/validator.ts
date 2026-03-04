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

export type ValidatorListNodeMetadata = {
  listId: string;
  scope: string;
  deletionLocked: boolean;
  description: string;
  updatedAt: string | null;
};

export const VALIDATOR_PATTERN_LISTS_KEY = 'validator_pattern_lists';
export const VALIDATOR_PATTERN_LISTS_VERSION = 2 as const;

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

export const buildDefaultValidatorPatternLists = (): ValidatorPatternList[] => {
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

export const parseValidatorScope = (value: string | null | undefined): ValidatorScope => {
  const result = validatorScopeSchema.safeParse(value);
  if (result.success) return result.data;
  return 'products';
};

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const normalizeValidatorListRecord = (
  value: unknown,
  fallback: ValidatorPatternList
): ValidatorPatternList => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  const normalizedName = normalizeString(record['name']);
  const normalizedDescription = normalizeString(record['description']);
  const normalizedId = normalizeString(record['id']);
  const normalizedScope = parseValidatorScope(
    typeof record['scope'] === 'string' ? record['scope'] : null
  );
  const createdAt = normalizeString(record['createdAt']) || fallback.createdAt;
  const updatedAt = normalizeString(record['updatedAt']) || fallback.updatedAt;

  return {
    id: normalizedId || fallback.id,
    name: normalizedName || fallback.name,
    description: normalizedDescription || fallback.description,
    scope: normalizedScope,
    deletionLocked:
      typeof record['deletionLocked'] === 'boolean'
        ? record['deletionLocked']
        : fallback.deletionLocked,
    createdAt,
    updatedAt,
    patterns: Array.isArray(record['patterns'])
      ? record['patterns'].map(String)
      : fallback.patterns,
    isActive: typeof record['isActive'] === 'boolean' ? record['isActive'] : fallback.isActive,
  };
};

export const ensureUniqueValidatorListIds = (
  lists: ValidatorPatternList[]
): ValidatorPatternList[] => {
  const seen = new Set<string>();
  const now = new Date().toISOString();
  return lists.map((list: ValidatorPatternList, index: number) => {
    const base = normalizeString(list.id) || `validator-list-${index + 1}`;
    let candidate = base;
    let counter = 2;
    while (seen.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    seen.add(candidate);
    return {
      ...list,
      id: candidate,
      createdAt: normalizeString(list.createdAt) || now,
      updatedAt: normalizeString(list.updatedAt) || now,
    };
  });
};

export const normalizeValidatorPatternLists = (
  value: ValidatorPatternList[]
): ValidatorPatternList[] => {
  const defaults = buildDefaultValidatorPatternLists();
  const fallbackById = new Map<string, ValidatorPatternList>(
    defaults.map((entry: ValidatorPatternList) => [entry.id, entry])
  );
  const normalized = value
    .filter((entry): entry is ValidatorPatternList => Boolean(entry))
    .map((entry: ValidatorPatternList, index: number) => {
      const fallback =
        fallbackById.get(entry.id) ??
        ({
          id: entry.id || `validator-list-${index + 1}`,
          name: 'Validation Pattern List',
          description: '',
          scope: 'products' as const,
          deletionLocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          patterns: [],
          isActive: true,
        } satisfies ValidatorPatternList);
      return normalizeValidatorListRecord(entry, fallback);
    });

  if (normalized.length === 0) return defaults;
  return ensureUniqueValidatorListIds(normalized);
};

export const buildValidatorPatternListsPayload = (
  lists: ValidatorPatternList[]
): {
  version: typeof VALIDATOR_PATTERN_LISTS_VERSION;
  lists: ValidatorPatternList[];
} => ({
  version: VALIDATOR_PATTERN_LISTS_VERSION,
  lists: normalizeValidatorPatternLists(lists),
});

const validatorPatternListsPayloadSchema = z.object({
  version: z.literal(VALIDATOR_PATTERN_LISTS_VERSION),
  lists: z.array(z.unknown()),
});

export const parseValidatorPatternLists = (value: unknown): ValidatorPatternList[] => {
  if (!value) return buildDefaultValidatorPatternLists();
  try {
    const raw = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
    const parsedPayload = validatorPatternListsPayloadSchema.safeParse(raw);
    if (parsedPayload.success) {
      const defaults = buildDefaultValidatorPatternLists();
      return normalizeValidatorPatternLists(
        parsedPayload.data.lists.map((entry: unknown, index: number) =>
          normalizeValidatorListRecord(entry, defaults[index] ?? defaults[0]!)
        )
      );
    }
    return buildDefaultValidatorPatternLists();
  } catch {
    return buildDefaultValidatorPatternLists();
  }
};
