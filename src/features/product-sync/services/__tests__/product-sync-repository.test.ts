import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProductSyncProfile,
  getDefaultProductSyncProfile,
  getProductSyncProfile,
  updateProductSyncProfile,
} from '../product-sync-repository';
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
          isDefault: true,
          enabled: true,
          name: 'Test',
          connectionId: 'conn-1',
          inventoryId: 'inv-1',
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
    it('should append new profile to settings array and mark the first profile as default', async () => {
      mockFindOne.mockResolvedValue(null);
      mockUpdateOne.mockResolvedValue({ acknowledged: true });

      const newProfile = {
        name: 'New Profile',
        connectionId: 'conn-1',
        inventoryId: 'inv-1',
      } as any;
      const result = await createProductSyncProfile(newProfile);

      expect(result.name).toBe('New Profile');
      expect(result.id).toBeDefined();
      expect(result.isDefault).toBe(true);
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

    it('promotes the selected default profile and keeps only one default', async () => {
      mockFindOne.mockResolvedValue({
        key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
        value: JSON.stringify([
          {
            id: 'profile-1',
            isDefault: true,
            enabled: true,
            name: 'Existing',
            connectionId: 'conn-1',
            inventoryId: 'inv-1',
            updatedAt: '2026-04-10T10:00:00.000Z',
          },
        ]),
      });
      mockUpdateOne.mockResolvedValue({ acknowledged: true });

      const created = await createProductSyncProfile({
        name: 'Manual sync',
        isDefault: true,
        connectionId: 'conn-2',
        inventoryId: 'inv-2',
      } as any);

      expect(created.isDefault).toBe(true);
      const writtenValue = JSON.parse(
        mockUpdateOne.mock.calls[0]?.[1]?.$set?.value ?? '[]'
      ) as Array<{ id: string; isDefault?: boolean }>;
      expect(writtenValue.filter((profile) => profile.isDefault)).toHaveLength(1);
      expect(writtenValue.find((profile) => profile.id === created.id)?.isDefault).toBe(true);
      expect(writtenValue.find((profile) => profile.id === 'profile-1')?.isDefault).toBe(false);
    });
  });

  describe('default profile resolution', () => {
    it('returns the explicit default profile when present', async () => {
      mockFindOne.mockResolvedValue({
        key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
        value: JSON.stringify([
          {
            id: 'profile-1',
            isDefault: false,
            enabled: true,
            name: 'A',
            connectionId: 'conn-1',
            inventoryId: 'inv-1',
            updatedAt: '2026-04-10T10:00:00.000Z',
          },
          {
            id: 'profile-2',
            isDefault: true,
            enabled: true,
            name: 'B',
            connectionId: 'conn-2',
            inventoryId: 'inv-2',
            updatedAt: '2026-04-10T11:00:00.000Z',
          },
        ]),
      });

      const result = await getDefaultProductSyncProfile();

      expect(result?.id).toBe('profile-2');
      expect(result?.isDefault).toBe(true);
    });

    it('backfills a default profile when persisted settings have none', async () => {
      mockFindOne.mockResolvedValue({
        key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
        value: JSON.stringify([
          {
            id: 'profile-1',
            enabled: true,
            name: 'A',
            connectionId: 'conn-1',
            inventoryId: 'inv-1',
            updatedAt: '2026-04-10T10:00:00.000Z',
          },
          {
            id: 'profile-2',
            enabled: true,
            name: 'B',
            connectionId: 'conn-2',
            inventoryId: 'inv-2',
            updatedAt: '2026-04-10T09:00:00.000Z',
          },
        ]),
      });

      const result = await getDefaultProductSyncProfile();

      expect(result?.id).toBe('profile-1');
      expect(result?.isDefault).toBe(true);
    });

    it('reassigns the default when the current default is unset', async () => {
      mockFindOne.mockResolvedValue({
        key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
        value: JSON.stringify([
          {
            id: 'profile-1',
            isDefault: true,
            enabled: true,
            name: 'A',
            connectionId: 'conn-1',
            inventoryId: 'inv-1',
            updatedAt: '2026-04-10T10:00:00.000Z',
          },
          {
            id: 'profile-2',
            isDefault: false,
            enabled: true,
            name: 'B',
            connectionId: 'conn-2',
            inventoryId: 'inv-2',
            updatedAt: '2026-04-10T09:00:00.000Z',
          },
        ]),
      });
      mockUpdateOne.mockResolvedValue({ acknowledged: true });

      const updated = await updateProductSyncProfile('profile-1', { isDefault: false } as any);

      expect(updated?.isDefault).toBe(false);
      const writtenValue = JSON.parse(
        mockUpdateOne.mock.calls[0]?.[1]?.$set?.value ?? '[]'
      ) as Array<{ id: string; isDefault?: boolean }>;
      expect(writtenValue.find((profile) => profile.id === 'profile-2')?.isDefault).toBe(true);
    });
  });
});
