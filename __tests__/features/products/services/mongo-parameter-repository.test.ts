import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  parameterFindOne: vi.fn(),
  parameterUpdateOne: vi.fn(),
  parameterDeleteOne: vi.fn(),
  parameterInsertOne: vi.fn(),
  parameterInsertMany: vi.fn(),
  parameterFind: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoParameterRepository } from '@/shared/lib/products/services/parameter-repository/mongo-parameter-repository';

describe('mongoParameterRepository legacy string ids', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'product_parameters') {
          return {};
        }

        return {
          findOne: mocks.parameterFindOne,
          updateOne: mocks.parameterUpdateOne,
          deleteOne: mocks.parameterDeleteOne,
          insertOne: mocks.parameterInsertOne,
          insertMany: mocks.parameterInsertMany,
          find: mocks.parameterFind,
        };
      },
    });
  });

  it('updates parameters that use legacy string ids from synced Mongo documents', async () => {
    const parameterId = '5b9e2a52-5b93-4d34-9468-3b5774a1d159';
    const now = new Date('2026-02-28T00:00:00.000Z');

    mocks.parameterUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as never);
    mocks.parameterFindOne.mockResolvedValue({
      _id: parameterId,
      id: parameterId,
      catalogId: 'catalog-1',
      name_en: 'Material',
      name_pl: null,
      name_de: null,
      selectorType: 'text',
      optionLabels: [],
      createdAt: now,
      updatedAt: now,
    });

    const result = await mongoParameterRepository.updateParameter(parameterId, {
      name_en: 'Material',
    });

    expect(mocks.parameterUpdateOne).toHaveBeenCalledWith(
      {
        $or: [{ _id: parameterId }, { id: parameterId }],
      },
      {
        $set: expect.objectContaining({
          name_en: 'Material',
          updatedAt: expect.any(Date),
        }),
      }
    );
    expect(result.id).toBe(parameterId);
  });

  it('deletes parameters that use legacy string ids from synced Mongo documents', async () => {
    const parameterId = '5b9e2a52-5b93-4d34-9468-3b5774a1d159';
    mocks.parameterDeleteOne.mockResolvedValue({ deletedCount: 1 } as never);

    await mongoParameterRepository.deleteParameter(parameterId);

    expect(mocks.parameterDeleteOne).toHaveBeenCalledWith({
      $or: [{ _id: parameterId }, { id: parameterId }],
    });
  });
});
