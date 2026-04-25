import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NextRequest } from 'next/server';
import { getPathSegments } from '@/shared/lib/api/catch-all-router';

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

import { DELETE, GET, PATCH, POST, PUT } from './route';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(path.join(currentDir, 'route.ts'), 'utf8');

describe('v2 products catch-all route module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIntegrationRepositoryMock.mockReturnValue({
      getConnectionById: vi.fn().mockResolvedValue({
        id: 'connection-1',
        integrationId: 'integration-base',
        baseLastInventoryId: 'inventory-from-connection',
        baseApiToken: null,
      }),
      getIntegrationById: vi.fn().mockResolvedValue({
        id: 'integration-base',
        slug: 'base-com',
      }),
    });
    resolveBaseConnectionTokenMock.mockReturnValue({ token: null, source: null, error: null });
    fetchBaseInventoriesMock.mockResolvedValue([]);
    createProductSyncProfileMock.mockResolvedValue({
      id: 'profile-route',
      name: 'Route-created Sync Profile',
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
  });

  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
    expect(typeof PUT).toBe('function');
    expect(typeof PATCH).toBe('function');
    expect(typeof DELETE).toBe('function');
  });

  it('registers shipping-groups routes before the generic product id route', () => {
    expect(routeSource).toContain(
      '{ pattern: [\'shipping-groups\'], loader: () => import(\'../shipping-groups/route-handler\') },'
    );
    expect(routeSource).toContain(
      '{ pattern: [\'shipping-groups\', param(\'id\')], loader: () => import(\'../shipping-groups/[id]/route-handler\') },'
    );

    const shippingGroupsIndex = routeSource.indexOf(
      '{ pattern: [\'shipping-groups\'], loader: () => import(\'../shipping-groups/route-handler\') },'
    );
    const shippingGroupsByIdIndex = routeSource.indexOf(
      '{ pattern: [\'shipping-groups\', param(\'id\')], loader: () => import(\'../shipping-groups/[id]/route-handler\') },'
    );
    const genericProductIdIndex = routeSource.indexOf(
      '{ pattern: [param(\'id\')], loader: () => import(\'../[id]/route-handler\') },'
    );

    expect(shippingGroupsIndex).toBeGreaterThan(-1);
    expect(shippingGroupsByIdIndex).toBeGreaterThan(-1);
    expect(genericProductIdIndex).toBeGreaterThan(-1);
    expect(shippingGroupsIndex).toBeLessThan(genericProductIdIndex);
    expect(shippingGroupsByIdIndex).toBeLessThan(genericProductIdIndex);
  });

  it('registers custom-fields routes before the generic product id route', () => {
    expect(routeSource).toContain(
      '{ pattern: [\'custom-fields\'], loader: () => import(\'../custom-fields/route-handler\') },'
    );
    expect(routeSource).toContain(
      '{ pattern: [\'custom-fields\', param(\'id\')], loader: () => import(\'../custom-fields/[id]/route-handler\') },'
    );

    const customFieldsIndex = routeSource.indexOf(
      '{ pattern: [\'custom-fields\'], loader: () => import(\'../custom-fields/route-handler\') },'
    );
    const customFieldsByIdIndex = routeSource.indexOf(
      '{ pattern: [\'custom-fields\', param(\'id\')], loader: () => import(\'../custom-fields/[id]/route-handler\') },'
    );
    const genericProductIdIndex = routeSource.indexOf(
      '{ pattern: [param(\'id\')], loader: () => import(\'../[id]/route-handler\') },'
    );

    expect(customFieldsIndex).toBeGreaterThan(-1);
    expect(customFieldsByIdIndex).toBeGreaterThan(-1);
    expect(genericProductIdIndex).toBeGreaterThan(-1);
    expect(customFieldsIndex).toBeLessThan(genericProductIdIndex);
    expect(customFieldsByIdIndex).toBeLessThan(genericProductIdIndex);
  });

  it('routes sync profile creation and lets the handler resolve a missing inventory id', async () => {
    expect(
      getPathSegments(
        new NextRequest('/api/v2/products/sync/profiles', {
          method: 'POST',
        }),
        '/api/v2/products'
      )
    ).toEqual(['sync', 'profiles']);

    const response = await POST(
      new NextRequest('/api/v2/products/sync/profiles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Route-created Sync Profile',
          connectionId: 'connection-1',
        }),
      }),
      { params: Promise.resolve({ path: ['sync', 'profiles'] }) }
    );

    const responseBody = await response.clone().json();
    expect(response.status, JSON.stringify(responseBody)).toBe(201);
    expect(createProductSyncProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Route-created Sync Profile',
        connectionId: 'connection-1',
        inventoryId: 'inventory-from-connection',
      })
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'profile-route',
        inventoryId: 'inventory-from-connection',
      })
    );
  });
});
