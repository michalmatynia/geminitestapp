import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAiPathsRunAccessMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
}));

import { GET_handler } from '@/app/api/ai-paths/[pathId]/run/stream/handler';

describe('AI Paths legacy run stream handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsRunAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
  });

  it('returns an actionable SSE failure message for stale clients', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/path_legacy/run/stream'),
      {} as never,
      { pathId: 'path_legacy' }
    );
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(payload).toContain('"type":"run_failed"');
    expect(payload).toContain('Refresh the page');
  });
});

