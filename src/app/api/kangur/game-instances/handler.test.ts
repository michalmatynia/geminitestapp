import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurGameInstance } from '@/shared/contracts/kangur-game-instances';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const {
  getKangurGameInstanceRepositoryMock,
  listInstancesMock,
  replaceInstancesForGameMock,
  resolveKangurActorMock,
} = vi.hoisted(() => ({
  getKangurGameInstanceRepositoryMock: vi.fn(),
  listInstancesMock: vi.fn(),
  replaceInstancesForGameMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-game-instance-repository', () => ({
  getKangurGameInstanceRepository: getKangurGameInstanceRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

import {
  clearKangurGameInstancesCache,
  getKangurGameInstancesHandler,
  postKangurGameInstancesHandler,
} from './handler';

const createRequestContext = (query?: Record<string, unknown>, body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-game-instances-1',
    traceId: 'trace-kangur-game-instances-1',
    correlationId: 'corr-kangur-game-instances-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
    body,
  }) as ApiHandlerContext;

const createClockInstance = (
  overrides: Partial<KangurGameInstance> = {}
): KangurGameInstance => ({
  id: 'clock_instance_saved',
  gameId: 'clock_training',
  launchableRuntimeId: 'clock_quiz',
  contentSetId: 'clock_training:clock-hours',
  title: 'Hours only clock',
  description: 'Saved clock instance.',
  emoji: '🕐',
  enabled: true,
  sortOrder: 1,
  engineOverrides: {
    clockInitialMode: 'challenge',
    showClockHourHand: true,
    showClockMinuteHand: false,
  },
  ...overrides,
});

describe('kangur game instances handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurGameInstancesCache();
    getKangurGameInstanceRepositoryMock.mockResolvedValue({
      listInstances: listInstancesMock,
      replaceInstancesForGame: replaceInstancesForGameMock,
    });
    resolveKangurActorMock.mockResolvedValue({ role: 'admin' });
  });

  it('reuses cached game instances across repeated list requests', async () => {
    listInstancesMock.mockResolvedValue([createClockInstance()]);

    const first = await getKangurGameInstancesHandler(
      new NextRequest(
        'http://localhost/api/kangur/game-instances?gameId=clock_training&enabledOnly=true'
      ),
      createRequestContext({
        enabledOnly: true,
        gameId: 'clock_training',
      })
    );
    const second = await getKangurGameInstancesHandler(
      new NextRequest(
        'http://localhost/api/kangur/game-instances?gameId=clock_training&enabledOnly=true'
      ),
      createRequestContext({
        enabledOnly: true,
        gameId: 'clock_training',
      })
    );

    expect(listInstancesMock).toHaveBeenCalledTimes(1);
    await expect(first.json()).resolves.toEqual([
      expect.objectContaining({ id: 'clock_instance_saved' }),
    ]);
    await expect(second.json()).resolves.toEqual([
      expect.objectContaining({ id: 'clock_instance_saved' }),
    ]);
  });

  it('passes filters through to the repository', async () => {
    listInstancesMock.mockResolvedValue([
      createClockInstance({
        id: 'clock_instance_minutes',
        contentSetId: 'clock_training:clock-minutes',
      }),
    ]);

    const response = await getKangurGameInstancesHandler(
      new NextRequest(
        'http://localhost/api/kangur/game-instances?instanceId=clock_instance_minutes&enabledOnly=true'
      ),
      createRequestContext({
        enabledOnly: true,
        instanceId: 'clock_instance_minutes',
      })
    );

    expect(listInstancesMock).toHaveBeenCalledWith({
      enabledOnly: true,
      gameId: undefined,
      instanceId: 'clock_instance_minutes',
    });
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'clock_instance_minutes',
      }),
    ]);
  });

  it('invalidates cached instances after a replace', async () => {
    const cachedInstance = createClockInstance();
    const replacedInstance = createClockInstance({
      id: 'clock_instance_updated',
      title: 'Updated clock instance',
    });

    listInstancesMock
      .mockResolvedValueOnce([cachedInstance])
      .mockResolvedValueOnce([replacedInstance]);
    replaceInstancesForGameMock.mockResolvedValue([replacedInstance]);

    await getKangurGameInstancesHandler(
      new NextRequest('http://localhost/api/kangur/game-instances?gameId=clock_training'),
      createRequestContext({ gameId: 'clock_training' })
    );

    await postKangurGameInstancesHandler(
      new NextRequest('http://localhost/api/kangur/game-instances', {
        method: 'POST',
      }),
      createRequestContext(undefined, {
        gameId: 'clock_training',
        instances: [replacedInstance],
      })
    );

    const refreshed = await getKangurGameInstancesHandler(
      new NextRequest('http://localhost/api/kangur/game-instances?gameId=clock_training'),
      createRequestContext({ gameId: 'clock_training' })
    );

    expect(replaceInstancesForGameMock).toHaveBeenCalledWith('clock_training', [
      expect.objectContaining({ id: 'clock_instance_updated' }),
    ]);
    expect(listInstancesMock).toHaveBeenCalledTimes(2);
    await expect(refreshed.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'clock_instance_updated',
      }),
    ]);
  });

  it('rejects writes for non-admin actors', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({ role: 'user' });

    await expect(
      postKangurGameInstancesHandler(
        new NextRequest('http://localhost/api/kangur/game-instances', {
          method: 'POST',
        }),
        createRequestContext(undefined, {
          gameId: 'clock_training',
          instances: [createClockInstance()],
        })
      )
    ).rejects.toMatchObject({
      httpStatus: 403,
    });

    expect(replaceInstancesForGameMock).not.toHaveBeenCalled();
  });
});
