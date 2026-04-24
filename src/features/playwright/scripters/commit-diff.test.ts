import { describe, expect, it, vi } from 'vitest';

import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';

import { buildScripterCommitDiff, type ExistingProductRef, type LookupExistingFn } from './commit-diff';
import type { ScripterImportDraft } from './scripter-import-source';

const makeDraft = (
  index: number,
  overrides: Partial<ScripterImportDraft> & { name?: string; price?: number; sku?: string | null } = {}
): ScripterImportDraft => ({
  index,
  externalId: overrides.sku ?? `ext-${index}`,
  draft: {
    name: overrides.name ?? `Item ${index}`,
    price: overrides.price ?? 10,
    sku: overrides.sku === undefined ? `sku-${index}` : overrides.sku,
  } as CreateProductDraftInput,
  raw: {},
  issues: [],
});

describe('buildScripterCommitDiff', () => {
  it('classifies drafts into new / update / unchanged / noKey', async () => {
    const drafts: ScripterImportDraft[] = [
      makeDraft(0, { sku: 'A1', name: 'Alpha New', price: 19.99 }),
      makeDraft(1, { sku: 'B2', name: 'Beta', price: 30 }),
      makeDraft(2, { sku: 'C3', name: 'Gamma', price: 5 }),
      makeDraft(3, { sku: null, name: 'No key' }),
    ];
    const existingBySku: Record<string, ExistingProductRef> = {
      A1: { id: 'p-1', sku: 'A1', name: 'Alpha Old', price: 19.99 },
      C3: { id: 'p-3', sku: 'C3', name: 'Gamma', price: 5 },
    };
    const lookup: LookupExistingFn = vi.fn(async (skus) =>
      skus.map((sku) => existingBySku[sku]).filter((ref): ref is ExistingProductRef => Boolean(ref))
    );
    const diff = await buildScripterCommitDiff(drafts, lookup);

    expect(lookup).toHaveBeenCalledWith(['A1', 'B2', 'C3', 'ext-3']);
    expect(diff.totals).toEqual({ new: 2, update: 1, noKey: 0, unchanged: 1 });

    expect(diff.update[0]?.changedFields).toEqual(['name']);
    expect(diff.update[0]?.existing?.id).toBe('p-1');
    expect(diff.unchanged[0]?.existing?.id).toBe('p-3');
    expect(diff.new.map((d) => d.externalId).sort()).toEqual(['B2', 'ext-3']);
  });

  it('falls back to externalId when draft.sku is empty', async () => {
    const drafts: ScripterImportDraft[] = [
      {
        index: 0,
        externalId: 'fallback-key',
        draft: { name: 'Foo', price: 1 } as CreateProductDraftInput,
        raw: {},
        issues: [],
      },
    ];
    const lookup: LookupExistingFn = vi.fn(async () => []);
    await buildScripterCommitDiff(drafts, lookup);
    expect(lookup).toHaveBeenCalledWith(['fallback-key']);
  });

  it('skips lookup entirely when no usable keys exist', async () => {
    const lookup: LookupExistingFn = vi.fn(async () => []);
    const diff = await buildScripterCommitDiff([
      {
        index: 0,
        externalId: null,
        draft: { name: 'X', price: 1 } as CreateProductDraftInput,
        raw: {},
        issues: [],
      },
    ], lookup);
    expect(lookup).not.toHaveBeenCalled();
    expect(diff.totals.noKey).toBe(1);
  });
});
