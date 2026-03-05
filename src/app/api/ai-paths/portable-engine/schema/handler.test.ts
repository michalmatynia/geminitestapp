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

describe('ai-paths portable-engine schema handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue(undefined);
  });

  it('returns portable schema catalog by default', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/schema') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(requireAiPathsAccessMock).toHaveBeenCalledTimes(1);

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['specVersion']).toBe(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION);
    expect(payload['kind']).toBe('all');
    const schemas = payload['schemas'] as Record<string, unknown>;
    expect(schemas).toBeDefined();
    expect(schemas['portable_envelope']).toBeDefined();
    expect(schemas['portable_package']).toBeDefined();
    expect(schemas['semantic_canvas']).toBeDefined();
    expect(schemas['path_config']).toBeDefined();
  });

  it('returns selected schema kind payload', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/schema?kind=portable_package') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['kind']).toBe('portable_package');
    expect(payload['schema']).toBeDefined();
    expect(payload['schemas']).toBeUndefined();
  });

  it('returns 304 for matching If-None-Match', async () => {
    const firstResponse = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/schema?kind=portable_package') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );
    const etag = firstResponse.headers.get('etag');
    expect(etag).toBeTruthy();

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/schema?kind=portable_package', {
        headers: {
          'if-none-match': etag ?? '',
        },
      }) as Parameters<typeof GET_handler>[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(304);
    expect(response.headers.get('etag')).toBe(etag);
    expect(response.headers.get('cache-control')).toContain('max-age=300');
  });

  it('rejects unsupported schema kinds', async () => {
    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/portable-engine/schema?kind=invalid') as Parameters<
          typeof GET_handler
        >[0],
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Invalid portable schema kind.');
  });
});
