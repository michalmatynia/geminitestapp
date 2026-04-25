import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createProductSyncProfileMock,
  fetchBaseInventoriesMock,
  getIntegrationRepositoryMock,
  listProductSyncProfilesMock,
  resolveBaseConnectionTokenMock,
} = vi.hoisted(() => ({
  createProductSyncProfileMock: vi.fn(),
  fetchBaseInventoriesMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  listProductSyncProfilesMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
}));

vi.mock('@/features/product-sync/services/product-sync-repository', () => ({
  createProductSyncProfile: createProductSyncProfileMock,
  listProductSyncProfiles: listProductSyncProfilesMock,
}));
vi.mock('@/features/integrations/services/base-token-resolver', () => ({
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
}));
vi.mock('@/features/integrations/services/integration-repository', () => ({
  getIntegrationRepository: getIntegrationRepositoryMock,
}));
vi.mock('@/features/integrations/services/imports/base-client/inventory', () => ({
  fetchBaseInventories: fetchBaseInventoriesMock,
}));

import { getHandler, postHandler, createProfileSchema } from './handler';

describe('product-sync profiles handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIntegrationRepositoryMock.mockReturnValue({
      getConnectionById: vi.fn(),
      getIntegrationById: vi.fn(),
    });
    resolveBaseConnectionTokenMock.mockReturnValue({ token: null, source: null, error: null });
    fetchBaseInventoriesMock.mockResolvedValue([]);
  });

  it('exports the supported handlers and schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
    expect(typeof createProfileSchema.safeParse).toBe('function');
  });

  it('allows create payloads without a client-provided inventory id', () => {
    expect(
      createProfileSchema.safeParse({
        name: 'Created Sync Profile',
        connectionId: 'connection-1',
      }).success
    ).toBe(true);
  });

  it('creates a profile with normalized field-rule ids', async () => {
    createProductSyncProfileMock.mockResolvedValue({
      id: 'profile-1',
      name: 'Created Sync Profile',
      isDefault: true,
      enabled: true,
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: null,
      scheduleIntervalMinutes: 30,
      batchSize: 100,
      conflictPolicy: 'skip',
      fieldRules: [],
      lastRunAt: null,
      createdAt: '2026-04-25T00:00:00.000Z',
      updatedAt: '2026-04-25T00:00:00.000Z',
    });

    const response = await postHandler({} as never, {
      body: {
        name: 'Created Sync Profile',
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        fieldRules: [
          {
            appField: 'stock',
            baseField: 'stock',
            direction: 'base_to_app',
          },
        ],
      },
    } as never);

    expect(response.status).toBe(201);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(createProductSyncProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Created Sync Profile',
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        fieldRules: [
          expect.objectContaining({
            id: expect.any(String),
            appField: 'stock',
            baseField: 'stock',
            direction: 'base_to_app',
          }),
        ],
      })
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'profile-1',
        name: 'Created Sync Profile',
      })
    );
  });

  it('resolves missing create inventory ids from the Base connection', async () => {
    const getConnectionById = vi.fn().mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-base',
      baseLastInventoryId: 'inventory-from-connection',
      baseApiToken: null,
    });
    const getIntegrationById = vi.fn().mockResolvedValue({
      id: 'integration-base',
      slug: 'base-com',
    });
    getIntegrationRepositoryMock.mockReturnValue({
      getConnectionById,
      getIntegrationById,
    });
    createProductSyncProfileMock.mockResolvedValue({
      id: 'profile-1',
      name: 'Created Sync Profile',
      isDefault: true,
      enabled: true,
      connectionId: 'connection-1',
      inventoryId: 'inventory-from-connection',
      catalogId: null,
      scheduleIntervalMinutes: 30,
      batchSize: 100,
      conflictPolicy: 'skip',
      fieldRules: [],
      lastRunAt: null,
      createdAt: '2026-04-25T00:00:00.000Z',
      updatedAt: '2026-04-25T00:00:00.000Z',
    });

    const response = await postHandler({} as never, {
      body: {
        name: 'Created Sync Profile',
        connectionId: 'connection-1',
      },
    } as never);

    expect(response.status).toBe(201);
    expect(createProductSyncProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-1',
        inventoryId: 'inventory-from-connection',
      })
    );
    expect(fetchBaseInventoriesMock).not.toHaveBeenCalled();
  });

  it('resolves missing create inventory ids from Base inventories when connection state is empty', async () => {
    getIntegrationRepositoryMock.mockReturnValue({
      getConnectionById: vi.fn().mockResolvedValue({
        id: 'connection-1',
        integrationId: 'integration-base',
        baseLastInventoryId: null,
        baseApiToken: 'encrypted-token',
      }),
      getIntegrationById: vi.fn().mockResolvedValue({
        id: 'integration-base',
        slug: 'base-com',
      }),
    });
    resolveBaseConnectionTokenMock.mockReturnValue({
      token: 'base-token',
      source: 'baseApiToken',
      error: null,
    });
    fetchBaseInventoriesMock.mockResolvedValue([
      { id: 'inventory-secondary', name: 'Secondary inventory', is_default: false },
      { id: 'inventory-default', name: 'Default inventory', is_default: true },
    ]);
    createProductSyncProfileMock.mockResolvedValue({
      id: 'profile-1',
      name: 'Created Sync Profile',
      isDefault: true,
      enabled: true,
      connectionId: 'connection-1',
      inventoryId: 'inventory-default',
      catalogId: null,
      scheduleIntervalMinutes: 30,
      batchSize: 100,
      conflictPolicy: 'skip',
      fieldRules: [],
      lastRunAt: null,
      createdAt: '2026-04-25T00:00:00.000Z',
      updatedAt: '2026-04-25T00:00:00.000Z',
    });

    const response = await postHandler({} as never, {
      body: {
        name: 'Created Sync Profile',
        connectionId: 'connection-1',
      },
    } as never);

    expect(response.status).toBe(201);
    expect(fetchBaseInventoriesMock).toHaveBeenCalledWith('base-token');
    expect(createProductSyncProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-1',
        inventoryId: 'inventory-default',
      })
    );
  });

  it('returns profiles with no-store cache headers', async () => {
    listProductSyncProfilesMock.mockResolvedValue([
      {
        id: 'profile-1',
        name: 'Existing Sync Profile',
      },
    ]);

    const response = await getHandler({} as never, {} as never);

    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      profiles: [
        {
          id: 'profile-1',
          name: 'Existing Sync Profile',
        },
      ],
    });
  });
});
