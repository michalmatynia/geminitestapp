import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';

const { requireAiPathsAccessMock } = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

import { GET_handler } from './handler';

describe('ai-paths portable-engine schema diff handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue(undefined);
  });

  it('returns schema diff catalog by default', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/schema/diff'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(requireAiPathsAccessMock).toHaveBeenCalledTimes(1);

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['specVersion']).toBe(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION);
    expect(payload['kind']).toBe('all');
    const diff = payload['diff'] as Record<string, unknown>;
    expect(diff['baseline']).toBe('current');
    expect(diff['target']).toBe('vnext_preview');
    const entries = diff['entries'] as unknown[];
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('returns selected schema diff entry payload', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/schema/diff?kind=portable_package'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['kind']).toBe('portable_package');
    expect(payload['entry']).toBeDefined();
    expect(payload['diff']).toBeUndefined();
  });

  it('returns 304 for matching If-None-Match', async () => {
    const firstResponse = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/schema/diff?kind=portable_package'),
      {} as Parameters<typeof GET_handler>[1]
    );
    const etag = firstResponse.headers.get('etag');
    expect(etag).toBeTruthy();

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/schema/diff?kind=portable_package', {
        headers: {
          'if-none-match': etag ?? '',
        },
      }),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(304);
    expect(response.headers.get('etag')).toBe(etag);
    expect(response.headers.get('cache-control')).toContain('max-age=300');
  });

  it('rejects unsupported schema diff kinds', async () => {
    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/portable-engine/schema/diff?kind=invalid'),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Invalid portable schema diff kind.');
  });
});
