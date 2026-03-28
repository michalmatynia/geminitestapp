import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET_heavy_handler } from './handler';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { GET_handler } from '../handler';

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../handler', () => ({
  GET_handler: vi.fn(),
}));

describe('settings/heavy GET_heavy_handler', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls assertSettingsManageAccess and delegates to base handler with heavy mode', async () => {
    vi.mocked(GET_handler).mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    const req = new NextRequest('http://localhost/api/settings/heavy');
    await GET_heavy_handler(req, mockContext);

    expect(assertSettingsManageAccess).toHaveBeenCalled();
    expect(GET_handler).toHaveBeenCalledWith(req, mockContext, 'heavy');
  });
});
