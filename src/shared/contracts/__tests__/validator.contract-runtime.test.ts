import { describe, expect, it } from 'vitest';

import {
  parseValidatorPatternLists,
  parseValidatorScope,
  buildDefaultValidatorPatternLists,
  buildValidatorPatternListsPayload,
  normalizeValidatorListRecord,
  normalizeValidatorPatternLists,
  ensureUniqueValidatorListIds,
} from '@/shared/contracts/validator';
import type { ValidatorPatternList } from '@/shared/contracts/validator';

const DEFAULT_SCOPE_IDS = [
  'products',
  'image-studio',
  'prompt-exploder',
  'case-resolver-prompt-exploder',
  'case-resolver-plain-text',
  'ai-paths',
] as const;

const FALLBACK: ValidatorPatternList = {
  id: 'fallback',
  name: 'Fallback List',
  description: 'Fallback description',
  scope: 'products',
  deletionLocked: false,
  patterns: ['fallback-pattern'],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ─── buildDefaultValidatorPatternLists ────────────────────────────────────────

describe('buildDefaultValidatorPatternLists', () => {
  it('returns exactly 6 lists covering all scopes', () => {
    const lists = buildDefaultValidatorPatternLists();
    expect(lists.map((l) => l.id)).toEqual(DEFAULT_SCOPE_IDS);
  });

  it('every list is active and deletion-locked by default', () => {
    const lists = buildDefaultValidatorPatternLists();
    expect(lists.every((l) => l.isActive)).toBe(true);
    expect(lists.every((l) => l.deletionLocked)).toBe(true);
  });

  it('every list has empty patterns array', () => {
    const lists = buildDefaultValidatorPatternLists();
    expect(lists.every((l) => l.patterns.length === 0)).toBe(true);
  });

  it('returns a new array on every call (no shared state)', () => {
    const a = buildDefaultValidatorPatternLists();
    const b = buildDefaultValidatorPatternLists();
    expect(a).not.toBe(b);
  });
});

// ─── parseValidatorScope ──────────────────────────────────────────────────────

describe('parseValidatorScope', () => {
  it.each(DEFAULT_SCOPE_IDS)('returns valid scope "%s" as-is', (scope) => {
    expect(parseValidatorScope(scope)).toBe(scope);
  });

  it('returns "products" for an unknown scope string', () => {
    expect(parseValidatorScope('unknown-scope')).toBe('products');
  });

  it('returns "products" for null', () => {
    expect(parseValidatorScope(null)).toBe('products');
  });

  it('returns "products" for undefined', () => {
    expect(parseValidatorScope(undefined)).toBe('products');
  });

  it('returns "products" for empty string', () => {
    expect(parseValidatorScope('')).toBe('products');
  });
});

// ─── normalizeValidatorListRecord ─────────────────────────────────────────────

describe('normalizeValidatorListRecord', () => {
  it('returns fallback for null input', () => {
    expect(normalizeValidatorListRecord(null, FALLBACK)).toEqual(FALLBACK);
  });

  it('returns fallback for non-object input', () => {
    expect(normalizeValidatorListRecord('string', FALLBACK)).toEqual(FALLBACK);
    expect(normalizeValidatorListRecord(42, FALLBACK)).toEqual(FALLBACK);
    expect(normalizeValidatorListRecord([], FALLBACK)).toEqual(FALLBACK);
  });

  it('normalizes a well-formed record', () => {
    const input = {
      id: 'my-list',
      name: '  My List  ',
      description: 'Desc',
      scope: 'ai-paths',
      deletionLocked: true,
      patterns: ['foo', 'bar'],
      isActive: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-06-01T00:00:00.000Z',
    };
    const result = normalizeValidatorListRecord(input, FALLBACK);
    expect(result.id).toBe('my-list');
    expect(result.name).toBe('My List'); // trimmed
    expect(result.scope).toBe('ai-paths');
    expect(result.deletionLocked).toBe(true);
    expect(result.patterns).toEqual(['foo', 'bar']);
    expect(result.isActive).toBe(false);
  });

  it('falls back to fallback id when id is missing', () => {
    const result = normalizeValidatorListRecord({ name: 'Test' }, FALLBACK);
    expect(result.id).toBe(FALLBACK.id);
  });

  it('falls back to fallback name when name is missing', () => {
    const result = normalizeValidatorListRecord({ id: 'x' }, FALLBACK);
    expect(result.name).toBe(FALLBACK.name);
  });

  it('maps invalid scope to "products"', () => {
    const result = normalizeValidatorListRecord(
      { id: 'x', name: 'X', scope: 'invalid-scope' },
      FALLBACK
    );
    expect(result.scope).toBe('products');
  });

  it('converts patterns items to strings', () => {
    const result = normalizeValidatorListRecord(
      { id: 'x', name: 'X', patterns: [1, true, 'hello'] },
      FALLBACK
    );
    expect(result.patterns).toEqual(['1', 'true', 'hello']);
  });

  it('uses fallback patterns when patterns is not an array', () => {
    const result = normalizeValidatorListRecord({ id: 'x', patterns: 'not-array' }, FALLBACK);
    expect(result.patterns).toEqual(FALLBACK.patterns);
  });
});

// ─── ensureUniqueValidatorListIds ─────────────────────────────────────────────

describe('ensureUniqueValidatorListIds', () => {
  it('passes through unique IDs unchanged', () => {
    const lists: ValidatorPatternList[] = [
      { ...FALLBACK, id: 'alpha' },
      { ...FALLBACK, id: 'beta' },
    ];
    const result = ensureUniqueValidatorListIds(lists);
    expect(result.map((l) => l.id)).toEqual(['alpha', 'beta']);
  });

  it('renames duplicate IDs with counter suffix', () => {
    const lists: ValidatorPatternList[] = [
      { ...FALLBACK, id: 'same' },
      { ...FALLBACK, id: 'same' },
      { ...FALLBACK, id: 'same' },
    ];
    const result = ensureUniqueValidatorListIds(lists);
    expect(result.map((l) => l.id)).toEqual(['same', 'same-2', 'same-3']);
  });

  it('generates id for empty-string id entries', () => {
    const lists: ValidatorPatternList[] = [{ ...FALLBACK, id: '' }];
    const result = ensureUniqueValidatorListIds(lists);
    expect(result[0]?.id).toBe('validator-list-1');
  });

  it('fills missing createdAt/updatedAt with current timestamp', () => {
    const before = Date.now();
    const lists: ValidatorPatternList[] = [{ ...FALLBACK, id: 'x', createdAt: '', updatedAt: '' }];
    const result = ensureUniqueValidatorListIds(lists);
    const after = Date.now();
    const ts = new Date(result[0]!.createdAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── normalizeValidatorPatternLists ───────────────────────────────────────────

describe('normalizeValidatorPatternLists', () => {
  it('returns defaults when given an empty array', () => {
    const result = normalizeValidatorPatternLists([]);
    expect(result.map((l) => l.id)).toEqual(DEFAULT_SCOPE_IDS);
  });

  it('normalizes and de-duplicates lists', () => {
    const lists: ValidatorPatternList[] = [
      { ...FALLBACK, id: 'products', scope: 'products' },
      { ...FALLBACK, id: 'products', scope: 'products' },
    ];
    const result = normalizeValidatorPatternLists(lists);
    const ids = result.map((l) => l.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('uses known defaults as fallback for matching IDs', () => {
    const lists: ValidatorPatternList[] = [
      { ...FALLBACK, id: 'products', name: '', scope: 'products' },
    ];
    const result = normalizeValidatorPatternLists(lists);
    const productsEntry = result.find((l) => l.id === 'products');
    // name was empty, falls back to default name
    expect(productsEntry?.name).toBe('Product Patterns');
  });
});

// ─── parseValidatorPatternLists ───────────────────────────────────────────────

describe('parseValidatorPatternLists', () => {
  it('returns default scoped validator stacks when value is missing', () => {
    const lists = parseValidatorPatternLists(null);
    expect(lists.map((list) => list.id)).toEqual(DEFAULT_SCOPE_IDS);
  });

  it('accepts canonical object payloads', () => {
    const defaults = parseValidatorPatternLists(null);
    const result = parseValidatorPatternLists(buildValidatorPatternListsPayload([defaults[0]!]));
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('products');
  });

  it('accepts canonical JSON payload strings', () => {
    const defaults = parseValidatorPatternLists(null);
    const caseResolverList = defaults.find((entry) => entry.id === 'case-resolver-prompt-exploder');
    expect(caseResolverList).toBeTruthy();

    const parsed = parseValidatorPatternLists(
      JSON.stringify(buildValidatorPatternListsPayload([caseResolverList!]))
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe('case-resolver-prompt-exploder');
    expect(parsed[0]?.scope).toBe('case-resolver-prompt-exploder');
  });

  it('falls back to defaults for legacy direct array payloads', () => {
    const defaults = parseValidatorPatternLists(null);
    const result = parseValidatorPatternLists([defaults[0]]);
    expect(result.map((list) => list.id)).toEqual(DEFAULT_SCOPE_IDS);
  });

  it('falls back to defaults for legacy envelope payloads without canonical version', () => {
    const defaults = parseValidatorPatternLists(null);
    const result = parseValidatorPatternLists({ version: 1, lists: [defaults[0]] });
    expect(result.map((list) => list.id)).toEqual(DEFAULT_SCOPE_IDS);
  });

  it('falls back to defaults for malformed JSON string', () => {
    const result = parseValidatorPatternLists('{not-json');
    expect(result.map((l) => l.id)).toEqual(DEFAULT_SCOPE_IDS);
  });

  it('falls back to defaults for empty array', () => {
    const result = parseValidatorPatternLists([]);
    expect(result.map((l) => l.id)).toEqual(DEFAULT_SCOPE_IDS);
  });

  it('falls back to defaults for undefined', () => {
    const result = parseValidatorPatternLists(undefined);
    expect(result.map((l) => l.id)).toEqual(DEFAULT_SCOPE_IDS);
  });
});
