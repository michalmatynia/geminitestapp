import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import * as policyModule from '../database-engine-policy';
import * as appDbProviderModule from '../app-db-provider';

// IMPORTANT: We must unmock the global mock from vitest.setup.ts to test the real implementation
vi.unmock('@/shared/lib/db/collection-provider-map');

vi.mock('@/shared/lib/db/mongo-client');
vi.mock('../database-engine-policy');
vi.mock('../app-db-provider');
vi.mock('@/shared/utils/observability/error-system');

describe('collection-provider-map', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the real function and invalidate cache
    const { invalidateCollectionProviderMapCache } = await import('../collection-provider-map');
    invalidateCollectionProviderMapCache();

    // Reset process.env for each test
    for (const key in process.env) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key in process.env) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it('should return mongodb if collection is explicitly routed to mongodb', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost';
    
    const mockFindOne = vi.fn().mockResolvedValue({ 
      value: JSON.stringify({ 'test-collection': 'mongodb' }) 
    });
    const mockCollection = { findOne: mockFindOne };
    const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) };
    vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);
    vi.mocked(policyModule.getDatabaseEnginePolicy).mockResolvedValue({} as any);

    const { getCollectionProvider } = await import('../collection-provider-map');
    const result = await getCollectionProvider('test-collection');
    
    expect(result).toBe('mongodb');
  });

  it('should throw error if collection is routed to redis', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost';
    
    const mockFindOne = vi.fn().mockResolvedValue({ 
      value: JSON.stringify({ 'test-collection': 'redis' }) 
    });
    const mockCollection = { findOne: mockFindOne };
    const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) };
    vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);
    vi.mocked(policyModule.getDatabaseEnginePolicy).mockResolvedValue({} as any);

    const { getCollectionProvider } = await import('../collection-provider-map');
    await expect(getCollectionProvider('test-collection')).rejects.toThrow('routed to Redis');
  });

  it('should fallback to app db provider if no explicit route', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost';
    
    const mockFindOne = vi.fn().mockResolvedValue(null);
    const mockCollection = { findOne: mockFindOne };
    const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) };
    vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);
    vi.mocked(policyModule.getDatabaseEnginePolicy).mockResolvedValue({ requireExplicitCollectionRouting: false } as any);
    vi.mocked(appDbProviderModule.getAppDbProvider).mockResolvedValue('mongodb');

    const { getCollectionProvider } = await import('../collection-provider-map');
    const result = await getCollectionProvider('other-collection');
    
    expect(result).toBe('mongodb');
    expect(appDbProviderModule.getAppDbProvider).toHaveBeenCalled();
  });
});
