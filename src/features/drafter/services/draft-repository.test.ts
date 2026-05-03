import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

import { createDraft, deleteDraft, listDrafts, updateDraft } from './draft-repository';

type DraftDoc = Record<string, unknown> & { _id: string | ObjectId };

type DraftIdFilter = {
  $or?: Array<{ _id?: string | ObjectId; id?: string }>;
  _id?: string | ObjectId;
  id?: string;
};

const normalizeId = (value: string | ObjectId | undefined): string | null => {
  if (value === undefined) return null;
  if (value instanceof ObjectId) return value.toHexString();
  return value;
};

const matchesDraftIdFilter = (doc: DraftDoc, filter: DraftIdFilter): boolean => {
  if (Array.isArray(filter.$or)) {
    return filter.$or.some((entry) => matchesDraftIdFilter(doc, entry));
  }

  const expectedMongoId = normalizeId(filter._id);
  if (expectedMongoId !== null) return normalizeId(doc._id) === expectedMongoId;

  const expectedDomainId = filter.id;
  return typeof expectedDomainId === 'string' && doc['id'] === expectedDomainId;
};

const createCollectionMock = (docs: DraftDoc[]) => ({
  find: vi.fn(() => ({
    sort: vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue(docs),
    })),
  })),
  findOne: vi.fn(async (filter: DraftIdFilter) =>
    docs.find((doc) => matchesDraftIdFilter(doc, filter)) ?? null
  ),
  insertOne: vi.fn(async (doc: DraftDoc) => {
    docs.push(doc);
    return { acknowledged: true };
  }),
  findOneAndUpdate: vi.fn(async (filter: DraftIdFilter, update: { $set: DraftDoc }) => {
    const index = docs.findIndex((doc) => matchesDraftIdFilter(doc, filter));
    if (index === -1) return null;
    docs[index] = {
      ...docs[index],
      ...update.$set,
    };
    return docs[index];
  }),
  deleteOne: vi.fn(async (filter: DraftIdFilter) => {
    const index = docs.findIndex((doc) => matchesDraftIdFilter(doc, filter));
    if (index === -1) return { deletedCount: 0 };
    docs.splice(index, 1);
    return { deletedCount: 1 };
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

  it('persists scrape template metadata on create, list, and update', async () => {
    const docs: DraftDoc[] = [];
    const collection = createCollectionMock(docs);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => collection),
    });

    const created = await createDraft({
      name: 'BattleStock scrape template',
      draftKind: 'scrape_template',
      scrapeProfileId: 'battlestock-warhammer-40k-30k',
    });

    expect(created).toEqual(
      expect.objectContaining({
        draftKind: 'scrape_template',
        scrapeProfileId: 'battlestock-warhammer-40k-30k',
      })
    );
    expect(docs[0]).toEqual(
      expect.objectContaining({
        draftKind: 'scrape_template',
        scrapeProfileId: 'battlestock-warhammer-40k-30k',
      })
    );

    await expect(listDrafts()).resolves.toEqual([
      expect.objectContaining({
        id: created.id,
        draftKind: 'scrape_template',
        scrapeProfileId: 'battlestock-warhammer-40k-30k',
      }),
    ]);

    const updated = await updateDraft(created.id, {
      draftKind: 'standard',
      scrapeProfileId: null,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: created.id,
        draftKind: 'standard',
        scrapeProfileId: null,
      })
    );
  });

  it('deletes drafts stored with Mongo ObjectId ids', async () => {
    const objectId = new ObjectId('507f1f77bcf86cd799439011');
    const docs: DraftDoc[] = [
      {
        _id: objectId,
        name: 'Legacy object id draft',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ];
    const collection = createCollectionMock(docs);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => collection),
    });

    await expect(deleteDraft(objectId.toHexString())).resolves.toBe(true);

    expect(docs).toHaveLength(0);
    expect(collection.deleteOne).toHaveBeenCalledWith({
      $or: [
        { _id: objectId.toHexString() },
        { id: objectId.toHexString() },
        { _id: objectId },
      ],
    });
  });
});
