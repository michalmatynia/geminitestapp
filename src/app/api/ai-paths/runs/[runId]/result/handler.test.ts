import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsRunAccessMock,
  assertAiPathRunAccessMock,
  resolvePathRunRepositoryMock,
} = vi.hoisted(() => ({
  requireAiPathsRunAccessMock: vi.fn(),
  assertAiPathRunAccessMock: vi.fn(),
  resolvePathRunRepositoryMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  assertAiPathRunAccess: assertAiPathRunAccessMock,
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/ai-paths/services/path-run-repository')>();
  return {
    ...actual,
    resolvePathRunRepository: resolvePathRunRepositoryMock,
  };
});

import { GET_handler } from './handler';

describe('ai-paths run result handler', () => {
  const repo = {
    findRunById: vi.fn(),
  };

  beforeEach(() => {
    requireAiPathsRunAccessMock.mockReset().mockResolvedValue({ userId: 'user-1' });
    assertAiPathRunAccessMock.mockReset().mockReturnValue(undefined);
    repo.findRunById.mockReset().mockResolvedValue({
      id: 'run-1',
      status: 'completed',
      result: {
        normalizedName: 'Normalized Name | 4 cm | Metal | Anime Pins | Anime',
      },
    });
    resolvePathRunRepositoryMock.mockReset().mockResolvedValue({
      provider: 'mongodb',
      routeMode: 'fallback',
      collection: 'ai_path_runs',
      repo,
    });
  });

  it('returns the compact run payload with repository headers', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-1/result'),
      {} as Parameters<typeof GET_handler>[1],
      { runId: 'run-1' }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Route-Mode')).toBe('fallback');
    await expect(response.json()).resolves.toMatchObject({
      run: {
        id: 'run-1',
        status: 'completed',
        result: {
          normalizedName: 'Normalized Name | 4 cm | Metal | Anime Pins | Anime',
        },
      },
    });
    expect(assertAiPathRunAccessMock).toHaveBeenCalledWith(
      { userId: 'user-1' },
      expect.objectContaining({ id: 'run-1' })
    );
  });

  it('returns not found when the run is missing', async () => {
    repo.findRunById.mockResolvedValueOnce(null);

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/runs/run-missing/result'),
        {} as Parameters<typeof GET_handler>[1],
        { runId: 'run-missing' }
      )
    ).rejects.toMatchObject({
      message: 'Run not found',
    });
  });
});
