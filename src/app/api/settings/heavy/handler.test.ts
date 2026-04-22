import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHeavyHandler } from './handler';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { getHandler } from '../handler';

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../handler', () => ({
  getHandler: vi.fn(),
}));

describe('settings/heavy getHeavyHandler', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls assertSettingsManageAccess and delegates to base handler with heavy mode', async () => {
    vi.mocked(getHandler).mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    const req = new NextRequest('http://localhost/api/settings/heavy');
    await getHeavyHandler(req, mockContext);

    expect(assertSettingsManageAccess).toHaveBeenCalled();
    expect(getHandler).toHaveBeenCalledWith(req, mockContext, 'heavy');
  });
});
