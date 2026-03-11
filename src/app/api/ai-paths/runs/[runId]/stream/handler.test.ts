import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertAiPathRunAccessMock,
  requireAiPathsRunAccessMock,
  resolvePathRunRepositoryMock,
  resolveAlternatePathRunRepositoryMock,
  getRedisSubscriberMock,
  isSubscriberConnectedMock,
} = vi.hoisted(() => ({
  assertAiPathRunAccessMock: vi.fn(),
  requireAiPathsRunAccessMock: vi.fn(),
  resolvePathRunRepositoryMock: vi.fn(),
  resolveAlternatePathRunRepositoryMock: vi.fn(),
  getRedisSubscriberMock: vi.fn(),
  isSubscriberConnectedMock: vi.fn(),
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
    resolveAlternatePathRunRepository: resolveAlternatePathRunRepositoryMock,
  };
});

vi.mock('@/shared/lib/redis-pubsub', () => ({
  getRedisSubscriber: getRedisSubscriberMock,
  isSubscriberConnected: isSubscriberConnectedMock,
}));

import { getAiPathRunStreamHandler, querySchema } from './handler';

describe('ai-paths run stream handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsRunAccessMock.mockResolvedValue({ userId: 'user-1' });
    assertAiPathRunAccessMock.mockReturnValue(undefined);
    getRedisSubscriberMock.mockReturnValue(null);
    isSubscriberConnectedMock.mockReturnValue(false);
    resolveAlternatePathRunRepositoryMock.mockResolvedValue(null);
  });

  it('exports the supported handlers and query schema', () => {
    expect(typeof getAiPathRunStreamHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });

  it('falls back to the alternate provider when the selected repository misses the run', async () => {
    const selectedRepo = {
      findRunById: vi.fn().mockResolvedValue(null),
      listRunNodes: vi.fn().mockResolvedValue([]),
      listRunEvents: vi.fn().mockResolvedValue([]),
    };
    const alternateRepo = {
      findRunById: vi.fn().mockResolvedValue({
        id: 'run-alt',
        status: 'completed',
        createdAt: '2026-03-11T08:10:00.000Z',
        updatedAt: '2026-03-11T08:10:05.000Z',
        pathId: 'path-1',
      }),
      listRunNodes: vi.fn().mockResolvedValue([]),
      listRunEvents: vi.fn().mockResolvedValue([]),
    };

    resolvePathRunRepositoryMock.mockResolvedValue({
      provider: 'mongodb',
      routeMode: 'fallback',
      collection: 'ai_path_runs',
      repo: selectedRepo,
    });
    resolveAlternatePathRunRepositoryMock.mockResolvedValue({
      provider: 'prisma',
      collection: 'ai_path_runs',
      repo: alternateRepo,
    });

    const response = await getAiPathRunStreamHandler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-alt/stream'),
      {} as Parameters<typeof getAiPathRunStreamHandler>[1],
      { runId: 'run-alt' }
    );

    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Route-Mode')).toBe('fallback');
    expect(response.headers.get('X-Ai-Paths-Run-Read-Provider')).toBe('prisma');
    expect(response.headers.get('X-Ai-Paths-Run-Read-Mode')).toBe('alternate');

    const body = await response.text();
    expect(body).toContain('event: ready');
    expect(body).toContain('"readProvider":"prisma"');
    expect(body).toContain('event: run');
    expect(body).toContain('event: done');

    expect(selectedRepo.findRunById).toHaveBeenCalledWith('run-alt');
    expect(alternateRepo.findRunById).toHaveBeenCalledWith('run-alt');
  });
});
