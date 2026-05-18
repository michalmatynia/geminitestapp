import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Db } from 'mongodb';
import { listAssets3D } from '@/features/viewer3d/services/asset3d-repository/repository-queries';
import { getCollection } from '@/features/viewer3d/services/asset3d-repository/repository-db-helpers';

vi.mock('@/features/viewer3d/services/asset3d-repository/repository-db-helpers');
vi.mock('@/features/viewer3d/services/asset3d-repository/repository-utils', async () => {
  const actual = await vi.importActual('@/features/viewer3d/services/asset3d-repository/repository-utils');
  return {
    ...actual,
    mapDocToRecord: (doc: any) => ({ id: doc.id, name: doc.name }),
  };
});

describe('listAssets3D', () => {
  let mockCollection: any;
  let mockDb: Db;

  beforeEach(() => {
    mockCollection = {
      find: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([{ id: '1', name: 'Test Asset' }]),
    };
    vi.mocked(getCollection).mockResolvedValue(mockCollection);
    mockDb = {} as Db;
  });

  it('should call collection.find with empty query when no filters are provided', async () => {
    await listAssets3D(mockDb);
    expect(mockCollection.find).toHaveBeenCalledWith({});
  });

  it('should apply filename filter correctly', async () => {
    await listAssets3D(mockDb, { filename: 'test' });
    expect(mockCollection.find).toHaveBeenCalledWith({
      $and: [{ filename: { $regex: 'test', $options: 'i' } }],
    });
  });

  it('should apply category filter correctly', async () => {
    await listAssets3D(mockDb, { categoryId: 'cat1' });
    expect(mockCollection.find).toHaveBeenCalledWith({
      $and: [{ $or: [{ categoryId: 'cat1' }, { category: 'cat1' }] }],
    });
  });
});
