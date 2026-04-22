import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHandler } from './handler';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { getSettingsCacheStats, isSettingsCacheDebugEnabled } from '@/shared/lib/settings-cache';

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/lib/settings-cache', () => ({
  getSettingsCacheStats: vi.fn(),
  isSettingsCacheDebugEnabled: vi.fn(),
}));

describe('settings/cache getHandler', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws notFoundError if debug is disabled', async () => {
    vi.mocked(isSettingsCacheDebugEnabled).mockReturnValue(false);
    const req = new NextRequest('http://localhost/api/settings/cache');
    await expect(getHandler(req, mockContext)).rejects.toThrow('Not found');
  });

  it('returns stats if debug is enabled', async () => {
    vi.mocked(isSettingsCacheDebugEnabled).mockReturnValue(true);
    const mockStats = { size: 10, hits: 5, misses: 2 };
    vi.mocked(getSettingsCacheStats).mockReturnValue(mockStats as any);

    const req = new NextRequest('http://localhost/api/settings/cache');
    const response = await getHandler(req, mockContext);
    const data = await response.json();

    expect(data).toEqual(mockStats);
    expect(assertSettingsManageAccess).toHaveBeenCalled();
  });
});
