import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsAccessMock,
  requireAiPathsRunAccessMock,
  enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccessMock,
  resolvePathRunRepositoryMock,
  deletePathRunWithRepositoryMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  requireAiPathsRunAccessMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  assertAiPathRunAccessMock: vi.fn(),
  resolvePathRunRepositoryMock: vi.fn(),
  deletePathRunWithRepositoryMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  assertAiPathRunAccess: assertAiPathRunAccessMock,
  deletePathRunWithRepository: deletePathRunWithRepositoryMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  requireAiPathsAccess: requireAiPathsAccessMock,
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

import { DELETE_handler, GET_handler } from './handler';

describe('ai-paths run detail handler', () => {
  const repo = {
    findRunById: vi.fn(),
    listRunNodes: vi.fn(),
    listRunEvents: vi.fn(),
  };

  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue({ userId: 'user-1' });
    requireAiPathsRunAccessMock.mockReset().mockResolvedValue({ userId: 'user-1' });
    enforceAiPathsActionRateLimitMock.mockReset().mockResolvedValue(undefined);
    assertAiPathRunAccessMock.mockReset().mockReturnValue(undefined);
    deletePathRunWithRepositoryMock.mockReset().mockResolvedValue(true);
    repo.findRunById.mockReset().mockResolvedValue({
      id: 'run-1',
      status: 'queued',
      meta: {
        runRepository: {
          collection: 'ai_path_runs',
          provider: 'mongodb',
          routeMode: 'fallback',
        },
      },
    });
    repo.listRunNodes.mockReset().mockResolvedValue([]);
    repo.listRunEvents.mockReset().mockResolvedValue([]);
    resolvePathRunRepositoryMock.mockReset().mockResolvedValue({
      provider: 'mongodb',
      routeMode: 'fallback',
      collection: 'ai_path_runs',
      repo,
    });
  });

  it('returns run detail with repository provider headers', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-1'),
      {} as Parameters<typeof GET_handler>[1],
      { runId: 'run-1' }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Route-Mode')).toBe('fallback');
    expect(response.headers.get('X-Ai-Paths-Run-Writer-Provider')).toBe('mongodb');
    await expect(response.json()).resolves.toMatchObject({
      run: {
        id: 'run-1',
        status: 'queued',
      },
      nodes: [],
      events: [],
      repository: {
        reader: {
          selectedProvider: 'mongodb',
          selectedRouteMode: 'fallback',
          readProvider: 'mongodb',
          readMode: 'selected',
        },
        writer: {
          provider: 'mongodb',
          routeMode: 'fallback',
        },
        mismatch: false,
      },
    });
    expect(assertAiPathRunAccessMock).toHaveBeenCalledWith(
      { userId: 'user-1' },
      expect.objectContaining({ id: 'run-1' })
    );
  });

  it('flags repository mismatch when persisted writer metadata differs from current reader selection', async () => {
    repo.findRunById.mockResolvedValueOnce({
      id: 'run-2',
      status: 'queued',
      meta: {
        runRepository: {
          collection: 'ai_path_runs',
          provider: 'mongodb',
          routeMode: 'explicit',
        },
      },
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-2'),
      {} as Parameters<typeof GET_handler>[1],
      { runId: 'run-2' }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Writer-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Provider-Mismatch')).toBe('1');
    await expect(response.json()).resolves.toMatchObject({
      repository: {
        reader: {
          selectedProvider: 'mongodb',
          selectedRouteMode: 'fallback',
          readProvider: 'mongodb',
          readMode: 'selected',
        },
        writer: {
          provider: 'mongodb',
          routeMode: 'explicit',
        },
        mismatch: true,
      },
    });
  });

  it('returns not found when the selected repository cannot find the run', async () => {
    repo.findRunById.mockResolvedValueOnce(null);
    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/runs/run-alt'),
        {} as Parameters<typeof GET_handler>[1],
        { runId: 'run-alt' }
      )
    ).rejects.toMatchObject({
      message: 'Run not found',
    });
  });

  it('deletes the run through the server-side repository delete flow', async () => {
    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-1', { method: 'DELETE' }),
      {} as Parameters<typeof DELETE_handler>[1],
      { runId: 'run-1' }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deleted: true,
      runId: 'run-1',
    });
    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      { userId: 'user-1' },
      'run-delete'
    );
    expect(deletePathRunWithRepositoryMock).toHaveBeenCalledWith(repo, 'run-1');
  });

  it('returns not found when the repository delete reports no matching run', async () => {
    deletePathRunWithRepositoryMock.mockResolvedValueOnce(false);

    await expect(
      DELETE_handler(
        new NextRequest('http://localhost/api/ai-paths/runs/run-1', { method: 'DELETE' }),
        {} as Parameters<typeof DELETE_handler>[1],
        { runId: 'run-1' }
      )
    ).rejects.toMatchObject({
      message: 'Run not found',
    });
  });
});
