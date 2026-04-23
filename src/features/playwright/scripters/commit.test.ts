import { describe, expect, it, vi } from 'vitest';

import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';

import { commitScripterDrafts, type CreateDraftFn } from './commit';
import type { ScripterImportDraft } from './scripter-import-source';

const makeDraft = (
  index: number,
  overrides: Partial<ScripterImportDraft> = {}
): ScripterImportDraft => ({
  index,
  externalId: `ext-${index}`,
  draft: { name: `Item ${index}` } as CreateProductDraftInput,
  raw: {},
  issues: [],
  ...overrides,
});

describe('commitScripterDrafts', () => {
  it('creates drafts and returns draft ids', async () => {
    const createDraft: CreateDraftFn = vi.fn(async (input) => ({
      id: `db-${(input as { name?: string }).name}`,
    }));
    const result = await commitScripterDrafts([makeDraft(0), makeDraft(1)], { createDraft });
    expect(result.createdCount).toBe(2);
    expect(result.outcomes).toEqual([
      { index: 0, externalId: 'ext-0', status: 'created', draftId: 'db-Item 0' },
      { index: 1, externalId: 'ext-1', status: 'created', draftId: 'db-Item 1' },
    ]);
  });

  it('skips records with blocking issues by default', async () => {
    const createDraft: CreateDraftFn = vi.fn(async () => ({ id: 'x' }));
    const broken = makeDraft(1, {
      issues: [{ field: 'title', severity: 'error', message: 'missing' }],
    });
    const result = await commitScripterDrafts([makeDraft(0), broken], { createDraft });
    expect(result.createdCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(createDraft).toHaveBeenCalledTimes(1);
    expect(result.outcomes[1]).toMatchObject({ status: 'skipped', reason: 'field-map errors' });
  });

  it('records failures without stopping the batch', async () => {
    const createDraft: CreateDraftFn = vi
      .fn<CreateDraftFn>()
      .mockImplementationOnce(async () => {
        throw new Error('db exploded');
      })
      .mockImplementationOnce(async () => ({ id: 'db-ok' }));
    const result = await commitScripterDrafts([makeDraft(0), makeDraft(1)], { createDraft });
    expect(result.failedCount).toBe(1);
    expect(result.createdCount).toBe(1);
    expect(result.outcomes[0]).toMatchObject({ status: 'failed', error: 'db exploded' });
    expect(result.outcomes[1]).toMatchObject({ status: 'created' });
  });

  it('skips remaining drafts after abort', async () => {
    const controller = new AbortController();
    const createDraft: CreateDraftFn = vi.fn(async (input) => {
      controller.abort();
      return { id: `db-${(input as { name?: string }).name}` };
    });
    const result = await commitScripterDrafts([makeDraft(0), makeDraft(1), makeDraft(2)], {
      createDraft,
      signal: controller.signal,
    });
    expect(result.createdCount).toBe(1);
    expect(result.skippedCount).toBe(2);
    expect(result.outcomes.slice(1).every((o) => o.status === 'skipped')).toBe(true);
  });
});
