/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  parameterDeleteOne: vi.fn(),
  parameterFind: vi.fn(),
  parameterFindOne: vi.fn(),
  parameterInsertMany: vi.fn(),
  parameterInsertOne: vi.fn(),
  parameterLimit: vi.fn(),
  parameterSkip: vi.fn(),
  parameterSort: vi.fn(),
  parameterToArray: vi.fn(),
  parameterUpdateOne: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomUUID: () => 'param-uuid',
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoParameterRepository } from './mongo-parameter-repository';

type CursorLike = {
  limit: typeof mocks.parameterLimit;
  skip: typeof mocks.parameterSkip;
  sort: typeof mocks.parameterSort;
  toArray: typeof mocks.parameterToArray;
};

describe('mongo-parameter-repository shared-lib', () => {
  beforeEach(() => {
    const cursor: CursorLike = {
      limit: mocks.parameterLimit,
      skip: mocks.parameterSkip,
      sort: mocks.parameterSort,
      toArray: mocks.parameterToArray,
    };

    mocks.parameterDeleteOne.mockReset();
    mocks.parameterFind.mockReset().mockReturnValue(cursor);
    mocks.parameterFindOne.mockReset();
    mocks.parameterInsertMany.mockReset();
    mocks.parameterInsertOne.mockReset();
    mocks.parameterLimit.mockReset().mockReturnValue(cursor);
    mocks.parameterSkip.mockReset().mockReturnValue(cursor);
    mocks.parameterSort.mockReset().mockReturnValue(cursor);
    mocks.parameterToArray.mockReset();
    mocks.parameterUpdateOne.mockReset();
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'product_parameters') return {};
        return {
          deleteOne: mocks.parameterDeleteOne,
          find: mocks.parameterFind,
          findOne: mocks.parameterFindOne,
          insertMany: mocks.parameterInsertMany,
          insertOne: mocks.parameterInsertOne,
          updateOne: mocks.parameterUpdateOne,
        };
      },
    });
  });

  it('lists parameters with normalized selector types and option labels', async () => {
    const now = new Date('2026-03-25T12:00:00.000Z');
    mocks.parameterToArray.mockResolvedValueOnce([
      {
        _id: 'legacy-id',
        id: 'legacy-id',
        catalogId: 'catalog-1',
        name_en: 'Material',
        name_pl: null,
        name_de: '',
        selectorType: 'RADIO',
        optionLabels: [' Small ', 'small', '', 'Large'],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await mongoParameterRepository.listParameters({
      catalogId: 'catalog-1',
      search: 'mat',
      skip: 2,
      limit: 5,
    });

    expect(mocks.parameterFind).toHaveBeenCalledWith({
      catalogId: 'catalog-1',
      $or: [
        { name_en: { $regex: 'mat', $options: 'i' } },
        { name_pl: { $regex: 'mat', $options: 'i' } },
        { name_de: { $regex: 'mat', $options: 'i' } },
      ],
    });
    expect(mocks.parameterSort).toHaveBeenCalledWith({ name_en: 1 });
    expect(mocks.parameterSkip).toHaveBeenCalledWith(2);
    expect(mocks.parameterLimit).toHaveBeenCalledWith(5);
    expect(result).toEqual([
      expect.objectContaining({
        id: 'legacy-id',
        selectorType: 'radio',
        optionLabels: ['Small', 'Large'],
      }),
    ]);
  });

  it('updates object-id backed parameters and deletes legacy string-id parameters', async () => {
    const objectId = '507f1f77bcf86cd799439011';
    const now = new Date('2026-03-25T12:30:00.000Z');
    mocks.parameterUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
    mocks.parameterFindOne.mockResolvedValueOnce({
      _id: new ObjectId(objectId),
      catalogId: 'catalog-1',
      name_en: 'Material',
      name_pl: null,
      name_de: null,
      selectorType: 'text',
      optionLabels: [],
      createdAt: now,
      updatedAt: now,
    });

    const updated = await mongoParameterRepository.updateParameter(objectId, {
      name_en: 'Material',
      optionLabels: ['A', 'a', 'B'],
      selectorType: 'invalid' as never,
    });

    expect(mocks.parameterUpdateOne).toHaveBeenCalledWith(
      {
        $or: [
          { _id: objectId },
          { id: objectId },
          { _id: expect.any(ObjectId) },
        ],
      },
      {
        $set: expect.objectContaining({
          name_en: 'Material',
          optionLabels: ['A', 'B'],
          selectorType: 'text',
          updatedAt: expect.any(Date),
        }),
      }
    );
    expect(updated.id).toBe(objectId);

    const legacyId = '5b9e2a52-5b93-4d34-9468-3b5774a1d159';
    await mongoParameterRepository.deleteParameter(legacyId);
    expect(mocks.parameterDeleteOne).toHaveBeenCalledWith({
      $or: [{ _id: legacyId }, { id: legacyId }],
    });
  });

  it('creates and bulk-creates parameters with normalized defaults', async () => {
    const insertedId = new ObjectId('507f1f77bcf86cd799439012');
    const now = new Date('2026-03-25T13:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mocks.parameterInsertOne.mockResolvedValueOnce({ insertedId });

    const created = await mongoParameterRepository.createParameter({
      catalogId: 'catalog-1',
      name_en: 'Color',
      name_pl: null,
      name_de: undefined,
      selectorType: 'dropdown',
      optionLabels: [' Red ', 'red', 'Blue'],
    });

    expect(mocks.parameterInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'param-uuid',
        selectorType: 'dropdown',
        optionLabels: ['Red', 'Blue'],
        createdAt: now,
        updatedAt: now,
      })
    );
    expect(created).toEqual(
      expect.objectContaining({
        id: 'param-uuid',
        optionLabels: ['Red', 'Blue'],
        selectorType: 'dropdown',
      })
    );

    mocks.parameterInsertMany.mockResolvedValueOnce({ acknowledged: true });
    const bulkCreated = await mongoParameterRepository.bulkCreateParameters([
      {
        catalogId: 'catalog-1',
        name_en: 'Width',
        selectorType: 'textarea',
        optionLabels: [' cm ', 'CM'],
      },
    ]);

    expect(mocks.parameterInsertMany).toHaveBeenCalledTimes(1);
    expect(bulkCreated).toHaveLength(1);
    expect(bulkCreated[0]).toEqual(
      expect.objectContaining({
        selectorType: 'textarea',
        optionLabels: ['cm'],
      })
    );

    mocks.parameterInsertMany.mockClear();
    expect(await mongoParameterRepository.bulkCreateParameters([])).toEqual([]);
    expect(mocks.parameterInsertMany).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
