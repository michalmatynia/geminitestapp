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

describe('DraftRepository (Prisma)', () => {
  beforeEach(async () => {
    if (!process.env['DATABASE_URL']) return;
    await prisma.productDraft.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and retrieve a draft', async () => {
    if (!process.env['DATABASE_URL']) return;

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
    if (!process.env['DATABASE_URL']) return;

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
    if (!process.env['DATABASE_URL']) return;

    const draft = await createDraft({ name: 'Old Name' });
    const updated = await updateDraft(draft.id, { name: 'New Name' });

    expect(updated?.name).toBe('New Name');

    const retrieved = await getDraft(draft.id);
    expect(retrieved?.name).toBe('New Name');
  });

  it('should delete a draft', async () => {
    if (!process.env['DATABASE_URL']) return;

    const draft = await createDraft({ name: 'To Delete' });
    await deleteDraft(draft.id);

    const retrieved = await getDraft(draft.id);
    expect(retrieved).toBeNull();
  });

  it('should return null when getting non-existent draft', async () => {
    if (!process.env['DATABASE_URL']) return;

    const retrieved = await getDraft('non-existent');
    expect(retrieved).toBeNull();
  });

  it('should handle array fields like catalogIds correctly', async () => {
    if (!process.env['DATABASE_URL']) return;

    const catalogIds = ['cat1', 'cat2'];
    const draft = await createDraft({
      name: 'Catalog Draft',
      catalogIds,
    });

    const retrieved = await getDraft(draft.id);
    expect(retrieved?.catalogIds).toEqual(catalogIds);
  });
});
