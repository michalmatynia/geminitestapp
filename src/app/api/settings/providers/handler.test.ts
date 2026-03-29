import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET_handler } from './handler';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/server';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { getIntegrationDataProvider } from '@/shared/lib/integrations/services/integration-provider';
import { getCmsDataProvider } from '@/shared/lib/cms/services/cms-provider';

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn().mockResolvedValue('mongodb'),
  APP_DB_PROVIDER_SETTING_KEY: 'app_db_provider',
}));

vi.mock('@/features/auth/server', () => ({
  getAuthDataProvider: vi.fn().mockResolvedValue('mongodb'),
  requireAuthProvider: vi.fn((v) => v),
  AUTH_SETTINGS_KEYS: { provider: 'auth_provider' },
  assertSettingsManageAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: vi.fn().mockResolvedValue('mongodb'),
}));

vi.mock('@/shared/lib/integrations/services/integration-provider', () => ({
  getIntegrationDataProvider: vi.fn().mockResolvedValue('mongodb'),
}));

vi.mock('@/shared/lib/cms/services/cms-provider', () => ({
  getCmsDataProvider: vi.fn().mockResolvedValue('mongodb'),
}));

describe('settings/providers GET_handler', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns diagnostics for all services', async () => {
    const req = new NextRequest('http://localhost/api/settings/providers');
    const response = await GET_handler(req, mockContext);
    const data = await response.json();

    expect(data.services).toHaveLength(5);
    expect(data.services.find((s: any) => s.service === 'app').effective).toBe('mongodb');
    expect(assertSettingsManageAccess).toHaveBeenCalled();
  });
});
