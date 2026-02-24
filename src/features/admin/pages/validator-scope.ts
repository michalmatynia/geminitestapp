import type { ValidatorScope, ValidatorPatternList } from '@/shared/contracts/admin';

export type { ValidatorScope, ValidatorPatternList };

export const VALIDATOR_PATTERN_LISTS_KEY = 'validator_pattern_lists';

export const VALIDATOR_SCOPE_LABELS: Record<ValidatorScope, string> = {
  products: 'Product Patterns',
  'image-studio': 'Image Studio Patterns',
  'prompt-exploder': 'Image Studio - Prompt Exploder',
  'case-resolver-prompt-exploder': 'Case Resolver - Prompt Exploder',
  'case-resolver-plain-text': 'Case Resolver - Plain Text',
  'ai-paths': 'AI Paths Patterns',
};

export const VALIDATOR_SCOPE_DESCRIPTIONS: Record<ValidatorScope, string> = {
  products: '',
  'image-studio':
    'Image Studio patterns control prompt validation rules used in AI image workflows.',
  'prompt-exploder':
    'Image Studio Prompt Exploder patterns control prompt segmentation, subsection recognition, and parser behavior for exploded prompt editing in Image Studio workflows.',
  'case-resolver-prompt-exploder':
    'Case Resolver Prompt Exploder patterns are isolated for Case Resolver document workflows.',
  'case-resolver-plain-text':
    'Case Resolver Plain Text patterns normalize and convert HTML-rich document content into plain text outputs for node connectors.',
  'ai-paths':
    'AI Paths patterns validate and format outputs from AI model nodes within visual AI workflow paths.',
};

const DEFAULT_PATTERN_LIST_DEFS: Array<{
  id: string;
  name: string;
  description: string;
  scope: ValidatorScope;
}> = [
  {
    id: 'products',
    name: 'Product Patterns',
    description:
      VALIDATOR_SCOPE_DESCRIPTIONS.products,
    scope: 'products',
  },
  {
    id: 'image-studio',
    name: 'Image Studio Patterns',
    description:
      VALIDATOR_SCOPE_DESCRIPTIONS['image-studio'],
    scope: 'image-studio',
  },
  {
    id: 'prompt-exploder',
    name: 'Image Studio - Prompt Exploder',
    description:
      VALIDATOR_SCOPE_DESCRIPTIONS['prompt-exploder'],
    scope: 'prompt-exploder',
  },
  {
    id: 'case-resolver-prompt-exploder',
    name: 'Case Resolver - Prompt Exploder',
    description:
      VALIDATOR_SCOPE_DESCRIPTIONS['case-resolver-prompt-exploder'],
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

const nowIso = (): string => new Date().toISOString();

/**
 * Validator docs: see docs/validator/function-reference.md#scope.defaultvalidatorpatternlists
 */
export const defaultValidatorPatternLists = (): ValidatorPatternList[] => {
  const now = nowIso();
  return DEFAULT_PATTERN_LIST_DEFS.map((entry) => ({
    id: entry.id,
    name: entry.name,
    description: entry.description,
    scope: entry.scope,
    deletionLocked: true,
    createdAt: now,
    updatedAt: now,
  }));
};

/**
 * Validator docs: see docs/validator/function-reference.md#scope.parsevalidatorscope
 */
export const parseValidatorScope = (value: string | null): ValidatorScope =>
  value === 'image-studio'
    ? 'image-studio'
    : value === 'prompt-exploder'
      ? 'prompt-exploder'
      : value === 'case-resolver-prompt-exploder'
        ? 'case-resolver-prompt-exploder'
        : value === 'case-resolver-plain-text'
          ? 'case-resolver-plain-text'
          : value === 'ai-paths'
            ? 'ai-paths'
            : 'products';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeListRecord = (
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
  const createdAtRaw = normalizeString(record['createdAt']);
  const updatedAtRaw = normalizeString(record['updatedAt']);
  const createdAt = createdAtRaw || fallback.createdAt;
  const updatedAt = updatedAtRaw || fallback.updatedAt;

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
  };
};

const ensureUniqueIds = (
  lists: ValidatorPatternList[]
): ValidatorPatternList[] => {
  const seen = new Set<string>();
  const now = nowIso();
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

/**
 * Validator docs: see docs/validator/function-reference.md#scope.normalizevalidatorpatternlists
 */
export const normalizeValidatorPatternLists = (
  value: ValidatorPatternList[]
): ValidatorPatternList[] => {
  const defaults = defaultValidatorPatternLists();
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
          createdAt: nowIso(),
          updatedAt: nowIso(),
        } satisfies ValidatorPatternList);
      return normalizeListRecord(entry, fallback);
    });

  if (normalized.length === 0) return defaults;
  return ensureUniqueIds(normalized);
};

/**
 * Validator docs: see docs/validator/function-reference.md#scope.parsevalidatorpatternlists
 */
export const parseValidatorPatternLists = (
  value: string | null | undefined
): ValidatorPatternList[] => {
  if (!value) return defaultValidatorPatternLists();
  try {
    const parsed = JSON.parse(value) as unknown;
    const defaults = defaultValidatorPatternLists();
    const rawLists =
      Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object'
          ? (() => {
            const record = parsed as Record<string, unknown>;
            return Array.isArray(record['lists']) ? (record['lists'] as unknown[]) : null;
          })()
          : null;

    if (Array.isArray(rawLists)) {
      return normalizeValidatorPatternLists(
        rawLists.map((entry: unknown, index: number) =>
          normalizeListRecord(entry, defaults[index] ?? defaults[0]!)
        )
      );
    }
    return defaults;
  } catch {
    return defaultValidatorPatternLists();
  }
};
