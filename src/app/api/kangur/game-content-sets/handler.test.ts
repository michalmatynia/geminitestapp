import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurGameContentSet } from '@/shared/contracts/kangur-game-instances';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getKangurGameContentSetRepositoryMock,
  listContentSetsMock,
  replaceContentSetsForGameMock,
  resolveKangurActorMock,
} = vi.hoisted(() => ({
  getKangurGameContentSetRepositoryMock: vi.fn(),
  listContentSetsMock: vi.fn(),
  replaceContentSetsForGameMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-game-content-set-repository', () => ({
  getKangurGameContentSetRepository: getKangurGameContentSetRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

import {
  clearKangurGameContentSetsCache,
  getKangurGameContentSetsHandler,
  postKangurGameContentSetsHandler,
} from './handler';

const createRequestContext = (query?: Record<string, unknown>, body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-game-content-sets-1',
    traceId: 'trace-kangur-game-content-sets-1',
    correlationId: 'corr-kangur-game-content-sets-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
    body,
  }) as ApiHandlerContext;

const createClockContentSet = (
  overrides: Partial<KangurGameContentSet> = {}
): KangurGameContentSet => ({
  id: 'clock_training:custom:hours-only',
  gameId: 'clock_training',
  engineId: 'clock_training_engine',
  launchableRuntimeId: 'clock_quiz',
  label: 'Hours only custom',
  description: 'Custom persisted hour-reading content set.',
  contentKind: 'clock_section',
  rendererProps: {
    clockSection: 'hours',
  },
  sortOrder: 10,
  ...overrides,
});

describe('kangur game content sets handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurGameContentSetsCache();
    getKangurGameContentSetRepositoryMock.mockResolvedValue({
      listContentSets: listContentSetsMock,
      replaceContentSetsForGame: replaceContentSetsForGameMock,
    });
    resolveKangurActorMock.mockResolvedValue({ role: 'admin' });
  });

  it('reuses cached content sets across repeated list requests', async () => {
    listContentSetsMock.mockResolvedValue([createClockContentSet()]);

    const first = await getKangurGameContentSetsHandler(
      new NextRequest('http://localhost/api/kangur/game-content-sets?gameId=clock_training'),
      createRequestContext({ gameId: 'clock_training' })
    );
    const second = await getKangurGameContentSetsHandler(
      new NextRequest('http://localhost/api/kangur/game-content-sets?gameId=clock_training'),
      createRequestContext({ gameId: 'clock_training' })
    );

    expect(listContentSetsMock).toHaveBeenCalledTimes(1);
    await expect(first.json()).resolves.toEqual([
      expect.objectContaining({ id: 'clock_training:custom:hours-only' }),
    ]);
    await expect(second.json()).resolves.toEqual([
      expect.objectContaining({ id: 'clock_training:custom:hours-only' }),
    ]);
  });

  it('passes filters through to the repository', async () => {
    listContentSetsMock.mockResolvedValue([
      createClockContentSet({
        id: 'clock_training:custom:minutes-only',
        rendererProps: { clockSection: 'minutes' },
      }),
    ]);

    const response = await getKangurGameContentSetsHandler(
      new NextRequest(
        'http://localhost/api/kangur/game-content-sets?contentSetId=clock_training:custom:minutes-only'
      ),
      createRequestContext({
        contentSetId: 'clock_training:custom:minutes-only',
      })
    );

    expect(listContentSetsMock).toHaveBeenCalledWith({
      contentSetId: 'clock_training:custom:minutes-only',
      gameId: undefined,
    });
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'clock_training:custom:minutes-only',
      }),
    ]);
  });

  it('invalidates cached content sets after a replace', async () => {
    const cachedContentSet = createClockContentSet();
    const replacedContentSet = createClockContentSet({
      id: 'clock_training:custom:combined-review',
      label: 'Combined review',
      rendererProps: { clockSection: 'combined' },
    });

    listContentSetsMock
      .mockResolvedValueOnce([cachedContentSet])
      .mockResolvedValueOnce([replacedContentSet]);
    replaceContentSetsForGameMock.mockResolvedValue([replacedContentSet]);

    await getKangurGameContentSetsHandler(
      new NextRequest('http://localhost/api/kangur/game-content-sets?gameId=clock_training'),
      createRequestContext({ gameId: 'clock_training' })
    );

    await postKangurGameContentSetsHandler(
      new NextRequest('http://localhost/api/kangur/game-content-sets', {
        method: 'POST',
      }),
      createRequestContext(undefined, {
        gameId: 'clock_training',
        contentSets: [replacedContentSet],
      })
    );

    const refreshed = await getKangurGameContentSetsHandler(
      new NextRequest('http://localhost/api/kangur/game-content-sets?gameId=clock_training'),
      createRequestContext({ gameId: 'clock_training' })
    );

    expect(replaceContentSetsForGameMock).toHaveBeenCalledWith('clock_training', [
      expect.objectContaining({ id: 'clock_training:custom:combined-review' }),
    ]);
    expect(listContentSetsMock).toHaveBeenCalledTimes(2);
    await expect(refreshed.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'clock_training:custom:combined-review',
      }),
    ]);
  });

  it('rejects writes for non-admin actors', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({ role: 'user' });

    await expect(
      postKangurGameContentSetsHandler(
        new NextRequest('http://localhost/api/kangur/game-content-sets', {
          method: 'POST',
        }),
        createRequestContext(undefined, {
          gameId: 'clock_training',
          contentSets: [createClockContentSet()],
        })
      )
    ).rejects.toMatchObject({
      httpStatus: 403,
    });

    expect(replaceContentSetsForGameMock).not.toHaveBeenCalled();
  });
});
