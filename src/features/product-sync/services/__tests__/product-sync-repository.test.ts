import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProductSyncProfile, createProductSyncProfile } from '../product-sync-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { PRODUCT_SYNC_PROFILE_SETTINGS_KEY } from '@/shared/contracts/product-sync';

vi.mock('@/shared/lib/db/mongo-client');
vi.mock('@/shared/utils/observability/error-system');

describe('product-sync-repository', () => {
  const mockFindOne = vi.fn();
  const mockUpdateOne = vi.fn();
  
  const mockCollection = {
    findOne: mockFindOne,
    updateOne: mockUpdateOne,
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);
  });

  describe('getProductSyncProfile', () => {
    it('should return profile if it exists in the settings array', async () => {
      mockFindOne.mockResolvedValue({
        key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
        value: JSON.stringify([{ 
          id: 'profile-1', 
          enabled: true, 
          name: 'Test',
          connectionId: 'conn-1',
          inventoryId: 'inv-1'
        }]),
      });

      const result = await getProductSyncProfile('profile-1');

      expect(result).toMatchObject({ id: 'profile-1', enabled: true, name: 'Test' });
    });

    it('should return null if setting does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await getProductSyncProfile('invalid');

      expect(result).toBeNull();
    });
  });

  describe('createProductSyncProfile', () => {
    it('should append new profile to settings array', async () => {
      // Mock existing empty profiles
      mockFindOne.mockResolvedValue(null);
      mockUpdateOne.mockResolvedValue({ acknowledged: true });

      const newProfile = { 
        name: 'New Profile',
        connectionId: 'conn-1',
        inventoryId: 'inv-1'
      } as any;
      const result = await createProductSyncProfile(newProfile);

      expect(result.name).toBe('New Profile');
      expect(result.id).toBeDefined();
      expect(mockUpdateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            value: expect.stringContaining('New Profile'),
          }),
        }),
        { upsert: true }
      );
    });
  });
});
