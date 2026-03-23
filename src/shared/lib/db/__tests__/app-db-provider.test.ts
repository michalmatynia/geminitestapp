import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import * as policyModule from '../database-engine-policy';

// IMPORTANT: We must unmock the global mock from vitest.setup.ts to test the real implementation
vi.unmock('@/shared/lib/db/app-db-provider');

vi.mock('@/shared/lib/db/mongo-client');
vi.mock('../database-engine-policy');
vi.mock('@/shared/utils/observability/runtime-error-reporting');

describe('app-db-provider', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the real function and invalidate cache
    const { invalidateAppDbProviderCache } = await import('../app-db-provider');
    invalidateAppDbProviderCache();

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

  it('should fallback to mongo settings if env is not set', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost';
    
    const mockFindOne = vi.fn().mockResolvedValue({ value: 'mongodb' });
    const mockCollection = { findOne: mockFindOne };
    const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) };
    vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);

    const { getAppDbProviderSetting } = await import('../app-db-provider');
    const result = await getAppDbProviderSetting();
    
    expect(result).toBe('mongodb');
    expect(mockDb.collection).toHaveBeenCalledWith('settings');
  });

  it('should throw error if route targets redis', async () => {
    vi.mocked(policyModule.getDatabaseEnginePolicy).mockResolvedValue({} as any);
    vi.mocked(policyModule.getDatabaseEngineServiceProvider).mockResolvedValue('redis');

    const { getAppDbProvider } = await import('../app-db-provider');
    await expect(getAppDbProvider()).rejects.toThrow('Database Engine route "app" cannot target Redis');
  });

  it('should throw error if explicit routing is required but missing', async () => {
    vi.mocked(policyModule.getDatabaseEnginePolicy).mockResolvedValue({ requireExplicitServiceRouting: true } as any);
    vi.mocked(policyModule.getDatabaseEngineServiceProvider).mockResolvedValue(null);

    const { getAppDbProvider } = await import('../app-db-provider');
    await expect(getAppDbProvider()).rejects.toThrow('Database Engine requires explicit service routing for "app"');
  });
});
