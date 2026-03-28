import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET_handler } from './handler';
import { listFileUploadEvents } from '@/features/files/server';
import { assertSettingsManageAccess } from '@/features/auth/server';

vi.mock('@/features/files/server', () => ({
  listFileUploadEvents: vi.fn(),
}));

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: vi.fn().mockResolvedValue(undefined),
}));

describe('system/upload-events GET_handler', () => {
  const mockContext = { source: 'test', query: {} } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls assertSettingsManageAccess', async () => {
    const req = new NextRequest('http://localhost/api/system/upload-events');
    await GET_handler(req, mockContext);
    expect(assertSettingsManageAccess).toHaveBeenCalled();
  });

  it('passes parsed query params to listFileUploadEvents', async () => {
    const mockResult = { items: [], total: 0 };
    vi.mocked(listFileUploadEvents).mockResolvedValue(mockResult as any);

    const contextWithQuery = { 
      ...mockContext, 
      query: { 
        page: 2, 
        status: 'success',
        from: '2026-01-01'
      } 
    };
    const req = new NextRequest('http://localhost/api/system/upload-events?page=2&status=success&from=2026-01-01');
    const response = await GET_handler(req, contextWithQuery);
    const data = await response.json();

    expect(data).toEqual(mockResult);
    expect(listFileUploadEvents).toHaveBeenCalledWith(expect.objectContaining({
      page: 2,
      status: 'success',
      from: expect.any(Date)
    }));
  });
});
