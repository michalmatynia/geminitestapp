/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  tagDeleteOne: vi.fn(),
  tagFind: vi.fn(),
  tagFindOne: vi.fn(),
  tagInsertOne: vi.fn(),
  tagLimit: vi.fn(),
  tagSkip: vi.fn(),
  tagSort: vi.fn(),
  tagToArray: vi.fn(),
  tagUpdateOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoTagRepository } from './mongo-tag-repository';

type CursorLike = {
  limit: typeof mocks.tagLimit;
  skip: typeof mocks.tagSkip;
  sort: typeof mocks.tagSort;
  toArray: typeof mocks.tagToArray;
};

describe('mongo-tag-repository shared-lib', () => {
  beforeEach(() => {
    const cursor: CursorLike = {
      limit: mocks.tagLimit,
      skip: mocks.tagSkip,
      sort: mocks.tagSort,
      toArray: mocks.tagToArray,
    };

    mocks.tagDeleteOne.mockReset();
    mocks.tagFind.mockReset().mockReturnValue(cursor);
    mocks.tagFindOne.mockReset();
    mocks.tagInsertOne.mockReset();
    mocks.tagLimit.mockReset().mockReturnValue(cursor);
    mocks.tagSkip.mockReset().mockReturnValue(cursor);
    mocks.tagSort.mockReset().mockReturnValue(cursor);
    mocks.tagToArray.mockReset();
    mocks.tagUpdateOne.mockReset();
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'product_tags') return {};
        return {
          deleteOne: mocks.tagDeleteOne,
          find: mocks.tagFind,
          findOne: mocks.tagFindOne,
          insertOne: mocks.tagInsertOne,
          updateOne: mocks.tagUpdateOne,
        };
      },
    });
  });

  it('lists tags with catalog and search filters plus skip and limit', async () => {
    const now = new Date('2026-03-25T18:00:00.000Z');
    mocks.tagToArray.mockResolvedValueOnce([
      {
        _id: new ObjectId('507f1f77bcf86cd799439031'),
        name: 'Blue',
        color: '#00f',
        catalogId: 'catalog-1',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await mongoTagRepository.listTags({
      catalogId: 'catalog-1',
      search: 'blu',
      skip: 2,
      limit: 5,
    });

    expect(mocks.tagFind).toHaveBeenCalledWith({
      catalogId: 'catalog-1',
      name: { $regex: 'blu', $options: 'i' },
    });
    expect(mocks.tagSort).toHaveBeenCalledWith({ name: 1 });
    expect(mocks.tagSkip).toHaveBeenCalledWith(2);
    expect(mocks.tagLimit).toHaveBeenCalledWith(5);
    expect(result).toEqual([
      expect.objectContaining({
        id: '507f1f77bcf86cd799439031',
        name: 'Blue',
        color: '#00f',
        catalogId: 'catalog-1',
      }),
    ]);
  });

  it('supports get by id, create, update, delete, and find by name', async () => {
    const tagId = new ObjectId('507f1f77bcf86cd799439032');
    const now = new Date('2026-03-25T18:15:00.000Z');

    mocks.tagFindOne
      .mockResolvedValueOnce({
        _id: tagId,
        name: 'Alpha',
        color: null,
        catalogId: 'catalog-1',
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: tagId,
        name: 'Alpha Updated',
        color: '#0f0',
        catalogId: 'catalog-1',
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: tagId,
        name: 'Alpha Updated',
        color: '#0f0',
        catalogId: 'catalog-1',
        createdAt: now,
        updatedAt: now,
      });
    mocks.tagInsertOne.mockResolvedValueOnce({ insertedId: tagId });

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const found = await mongoTagRepository.getTagById(tagId.toString());
    const created = await mongoTagRepository.createTag({
      name: 'Alpha',
      color: null,
      catalogId: 'catalog-1',
    });
    const updated = await mongoTagRepository.updateTag(tagId.toString(), {
      name: 'Alpha Updated',
      color: '#0f0',
    });
    const byName = await mongoTagRepository.findByName('catalog-1', 'Alpha Updated');
    await mongoTagRepository.deleteTag(tagId.toString());

    vi.useRealTimers();

    expect(found?.id).toBe(tagId.toString());
    expect(mocks.tagInsertOne).toHaveBeenCalledWith({
      name: 'Alpha',
      color: null,
      catalogId: 'catalog-1',
      createdAt: now,
      updatedAt: now,
    });
    expect(created.id).toBe(tagId.toString());
    expect(mocks.tagUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: expect.objectContaining({
          name: 'Alpha Updated',
          color: '#0f0',
          updatedAt: expect.any(Date),
        }),
      }
    );
    expect(updated.name).toBe('Alpha Updated');
    expect(mocks.tagFindOne).toHaveBeenLastCalledWith({
      catalogId: 'catalog-1',
      name: 'Alpha Updated',
    });
    expect(byName?.id).toBe(tagId.toString());
    expect(mocks.tagDeleteOne).toHaveBeenCalledWith({ _id: expect.any(ObjectId) });
  });

  it('throws an internal error when the updated tag cannot be reloaded', async () => {
    const tagId = new ObjectId('507f1f77bcf86cd799439033');

    mocks.tagUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
    mocks.tagFindOne.mockResolvedValueOnce(null);

    await expect(
      mongoTagRepository.updateTag(tagId.toString(), {
        name: 'Missing',
      })
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update tag',
    });
  });
});
