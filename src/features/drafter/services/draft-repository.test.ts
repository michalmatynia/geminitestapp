import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

import { createDraft, listDrafts, updateDraft } from './draft-repository';

type DraftDoc = Record<string, unknown> & { _id: string };

const createCollectionMock = (docs: DraftDoc[]) => ({
  find: vi.fn(() => ({
    sort: vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue(docs),
    })),
  })),
  findOne: vi.fn(async ({ _id }: { _id: string }) => docs.find((doc) => doc._id === _id) ?? null),
  insertOne: vi.fn(async (doc: DraftDoc) => {
    docs.push(doc);
    return { acknowledged: true };
  }),
  findOneAndUpdate: vi.fn(async ({ _id }: { _id: string }, update: { $set: DraftDoc }) => {
    const index = docs.findIndex((doc) => doc._id === _id);
    if (index === -1) return null;
    docs[index] = {
      ...docs[index],
      ...update.$set,
    };
    return docs[index];
  }),
});

describe('draft-repository importSource persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns importSource from listed drafts', async () => {
    const docs: DraftDoc[] = [
      {
        _id: 'draft-1',
        name: 'Imported draft',
        importSource: 'base',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ];
    const collection = createCollectionMock(docs);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => collection),
    });

    await expect(listDrafts()).resolves.toEqual([
      expect.objectContaining({
        id: 'draft-1',
        importSource: 'base',
      }),
    ]);
  });

  it('persists importSource on create and update', async () => {
    const docs: DraftDoc[] = [];
    const collection = createCollectionMock(docs);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => collection),
    });

    const created = await createDraft({
      name: 'Imported draft',
      importSource: 'base',
    });

    expect(created.importSource).toBe('base');
    expect(docs[0]?.importSource).toBe('base');

    const updated = await updateDraft(created.id, { importSource: 'base' });

    expect(updated).toEqual(
      expect.objectContaining({
        id: created.id,
        importSource: 'base',
      })
    );
  });
});
