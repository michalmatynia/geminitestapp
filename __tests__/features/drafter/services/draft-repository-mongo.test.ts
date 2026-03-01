import { describe, it, expect, vi, beforeEach } from 'vitest';

const validId = '507f1f77bcf86cd799439011';

vi.mock('crypto', () => {
  const mockRandomUUID = () => '507f1f77bcf86cd799439011';
  return {
    randomUUID: mockRandomUUID,
    default: {
      randomUUID: mockRandomUUID,
    },
  };
});

import {
  createDraft,
  getDraft,
  listDrafts,
  updateDraft,
  deleteDraft,
} from '@/features/drafter/services/draft-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('mongodb', async () => {
  const actual = (await vi.importActual('mongodb'));
  return {
    ...actual,
    ObjectId: vi.fn().mockImplementation((id: string) => ({
      toString: () => id,
      equals: (other: unknown) =>
        other && (other as { toString: () => string }).toString() === id,
    })),
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: vi.fn().mockResolvedValue('mongodb'),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: vi.fn(),
}));

describe('DraftRepository (MongoDB)', () => {
  const mockCollection = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    findOne: vi.fn(),
    insertOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);
  });

  it('should create and retrieve a draft', async () => {
    const input = {
      name: 'Mongo Draft',
      description: 'Mongo Desc',
    };
    mockCollection.insertOne.mockResolvedValue({ insertedId: validId });
    mockCollection.findOne.mockResolvedValue({ _id: validId, ...input });

    const created = await createDraft(input);
    expect(created.id).toBe(validId);
    expect(created.name).toBe('Mongo Draft');

    const retrieved = await getDraft(created.id);
    expect(retrieved?.id).toBe(created.id);
  });

  it('should list drafts', async () => {
    mockCollection.toArray.mockResolvedValue([{ _id: validId, name: 'D1' }]);
    const result = await listDrafts();
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('D1');
  });

  it('should update a draft', async () => {
    // Mocking the result that matches the repo's check for 'value' in result
    mockCollection.findOneAndUpdate.mockResolvedValue({ _id: validId, name: 'Updated' });
    const result = await updateDraft(validId, { name: 'Updated' });
    expect(result?.name).toBe('Updated');
  });

  it('should delete a draft', async () => {
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const result = await deleteDraft(validId);
    expect(result).toBe(true);
  });
});
