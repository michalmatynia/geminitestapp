import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import {
  createDraft,
  getDraft,
  listDrafts,
  updateDraft,
  deleteDraft,
} from '@/features/drafter/services/draft-repository';
import prisma from '@/shared/lib/db/prisma';

let canMutateDraftRepositoryTables = true;

describe('DraftRepository (Prisma)', () => {
  const shouldSkipDraftRepositoryTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutateDraftRepositoryTables;

  beforeEach(async () => {
    if (shouldSkipDraftRepositoryTests()) return;
    try {
      await prisma.productDraft.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutateDraftRepositoryTables = false;
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and retrieve a draft', async () => {
    if (shouldSkipDraftRepositoryTests()) return;

    const data = {
      name: 'Test Draft',
      sku: 'SKU123',
      price: 100,
    };

    const created = await createDraft(data);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Test Draft');

    const retrieved = await getDraft(created.id);
    expect(retrieved?.sku).toBe('SKU123');
  });

  it('should list all drafts ordered by createdAt desc', async () => {
    if (shouldSkipDraftRepositoryTests()) return;

    await createDraft({ name: 'Draft 1' });
    // Small delay to ensure distinct createdAt
    await new Promise((resolve) => setTimeout(resolve, 10));
    await createDraft({ name: 'Draft 2' });

    const drafts = await listDrafts();
    expect(drafts.length).toBe(2);
    // Should be newest first
    expect(drafts[0]!.name).toBe('Draft 2');
    expect(drafts[1]!.name).toBe('Draft 1');
  });

  it('should update a draft', async () => {
    if (shouldSkipDraftRepositoryTests()) return;

    const draft = await createDraft({ name: 'Old Name' });
    const updated = await updateDraft(draft.id, { name: 'New Name' });

    expect(updated?.name).toBe('New Name');

    const retrieved = await getDraft(draft.id);
    expect(retrieved?.name).toBe('New Name');
  });

  it('should delete a draft', async () => {
    if (shouldSkipDraftRepositoryTests()) return;

    const draft = await createDraft({ name: 'To Delete' });
    await deleteDraft(draft.id);

    const retrieved = await getDraft(draft.id);
    expect(retrieved).toBeNull();
  });

  it('should return null when getting non-existent draft', async () => {
    if (shouldSkipDraftRepositoryTests()) return;

    const retrieved = await getDraft('non-existent');
    expect(retrieved).toBeNull();
  });

  it('should handle array fields like catalogIds correctly', async () => {
    if (shouldSkipDraftRepositoryTests()) return;

    const catalogIds = ['cat1', 'cat2'];
    const draft = await createDraft({
      name: 'Catalog Draft',
      catalogIds,
    });

    const retrieved = await getDraft(draft.id);
    expect(retrieved?.catalogIds).toEqual(catalogIds);
  });
});
