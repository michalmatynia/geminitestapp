/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  producerDeleteOne: vi.fn(),
  producerFind: vi.fn(),
  producerFindOne: vi.fn(),
  producerInsertOne: vi.fn(),
  producerLimit: vi.fn(),
  producerSkip: vi.fn(),
  producerSort: vi.fn(),
  producerToArray: vi.fn(),
  producerUpdateOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoProducerRepository } from './mongo-producer-repository';

type CursorLike = {
  limit: typeof mocks.producerLimit;
  skip: typeof mocks.producerSkip;
  sort: typeof mocks.producerSort;
  toArray: typeof mocks.producerToArray;
};

describe('mongo-producer-repository shared-lib', () => {
  beforeEach(() => {
    const cursor: CursorLike = {
      limit: mocks.producerLimit,
      skip: mocks.producerSkip,
      sort: mocks.producerSort,
      toArray: mocks.producerToArray,
    };

    mocks.producerDeleteOne.mockReset();
    mocks.producerFind.mockReset().mockReturnValue(cursor);
    mocks.producerFindOne.mockReset();
    mocks.producerInsertOne.mockReset();
    mocks.producerLimit.mockReset().mockReturnValue(cursor);
    mocks.producerSkip.mockReset().mockReturnValue(cursor);
    mocks.producerSort.mockReset().mockReturnValue(cursor);
    mocks.producerToArray.mockReset();
    mocks.producerUpdateOne.mockReset();
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'product_producers') return {};
        return {
          deleteOne: mocks.producerDeleteOne,
          find: mocks.producerFind,
          findOne: mocks.producerFindOne,
          insertOne: mocks.producerInsertOne,
          updateOne: mocks.producerUpdateOne,
        };
      },
    });
  });

  it('lists producers with search filters, skip, and limit', async () => {
    const now = new Date('2026-03-25T14:00:00.000Z');
    mocks.producerToArray.mockResolvedValueOnce([
      {
        _id: new ObjectId('507f1f77bcf86cd799439013'),
        name: 'Acme',
        website: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await mongoProducerRepository.listProducers({
      search: 'ac',
      skip: 1,
      limit: 10,
    });

    expect(mocks.producerFind).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: 'ac', $options: 'i' } },
        { website: { $regex: 'ac', $options: 'i' } },
      ],
    });
    expect(mocks.producerSort).toHaveBeenCalledWith({ name: 1 });
    expect(mocks.producerSkip).toHaveBeenCalledWith(1);
    expect(mocks.producerLimit).toHaveBeenCalledWith(10);
    expect(result).toEqual([
      expect.objectContaining({
        name: 'Acme',
        website: null,
      }),
    ]);
  });

  it('short-circuits invalid ids and supports create, update, delete, and findByName', async () => {
    expect(await mongoProducerRepository.getProducerById('not-an-object-id')).toBeNull();
    expect(mocks.producerFindOne).not.toHaveBeenCalled();

    const producerId = new ObjectId('507f1f77bcf86cd799439014');
    const now = new Date('2026-03-25T14:30:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mocks.producerInsertOne.mockResolvedValueOnce({ insertedId: producerId });

    const created = await mongoProducerRepository.createProducer({
      name: 'Beta',
      website: 'https://beta.test',
    });

    expect(mocks.producerInsertOne).toHaveBeenCalledWith({
      name: 'Beta',
      website: 'https://beta.test',
      createdAt: now,
      updatedAt: now,
    });
    expect(created).toEqual(
      expect.objectContaining({
        id: producerId.toString(),
        name: 'Beta',
        website: 'https://beta.test',
      })
    );

    mocks.producerUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
    mocks.producerFindOne.mockResolvedValueOnce({
      _id: producerId,
      name: 'Beta Updated',
      website: null,
      createdAt: now,
      updatedAt: now,
    });

    const updated = await mongoProducerRepository.updateProducer(producerId.toString(), {
      name: 'Beta Updated',
      website: null,
    });

    const updateFilter = mocks.producerUpdateOne.mock.calls[0]?.[0] as { _id: ObjectId };
    expect(updateFilter._id.toString()).toBe(producerId.toString());
    expect(mocks.producerUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.any(ObjectId) }),
      {
        $set: expect.objectContaining({
          name: 'Beta Updated',
          website: null,
          updatedAt: expect.any(Date),
        }),
      }
    );
    expect(updated.name).toBe('Beta Updated');

    mocks.producerFindOne.mockResolvedValueOnce({
      _id: producerId,
      name: 'Beta Updated',
      website: null,
      createdAt: now,
      updatedAt: now,
    });
    const found = await mongoProducerRepository.findByName('Beta Updated');
    expect(mocks.producerFindOne).toHaveBeenLastCalledWith({ name: 'Beta Updated' });
    expect(found?.id).toBe(producerId.toString());

    await mongoProducerRepository.deleteProducer(producerId.toString());
    const deleteFilter = mocks.producerDeleteOne.mock.calls[0]?.[0] as { _id: ObjectId };
    expect(deleteFilter._id.toString()).toBe(producerId.toString());
    vi.useRealTimers();
  });
});
