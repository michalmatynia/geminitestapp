import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAiPathsAccessMock, getLegacyCompatCounterSnapshotMock } = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  getLegacyCompatCounterSnapshotMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

vi.mock('@/shared/lib/observability/legacy-compat-counters', () => ({
  getLegacyCompatCounterSnapshot: getLegacyCompatCounterSnapshotMock,
}));

import { GET_handler } from './handler';

describe('ai-paths legacy-compat counters handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsAccessMock.mockResolvedValue({
      userId: 'user-1',
      permissions: ['products.manage'],
      isElevated: false,
    });
    getLegacyCompatCounterSnapshotMock.mockReturnValue({
      legacy_key_read: 3,
      legacy_payload_received: 4,
      compat_route_hit: 5,
    });
  });

  it('returns current counters with a total and generation timestamp', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/legacy-compat/counters') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(requireAiPathsAccessMock).toHaveBeenCalledTimes(1);
    expect(getLegacyCompatCounterSnapshotMock).toHaveBeenCalledTimes(1);

    const payload = (await response.json()) as {
      snapshot: {
        counters: {
          legacy_key_read: number;
          legacy_payload_received: number;
          compat_route_hit: number;
        };
        total: number;
        generatedAt: string;
      };
    };

    expect(payload.snapshot.counters).toEqual({
      legacy_key_read: 3,
      legacy_payload_received: 4,
      compat_route_hit: 5,
    });
    expect(payload.snapshot.total).toBe(12);
    expect(Number.isNaN(new Date(payload.snapshot.generatedAt).getTime())).toBe(false);
  });
});
