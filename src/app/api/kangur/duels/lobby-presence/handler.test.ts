import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  listKangurDuelLobbyPresenceMock,
  recordKangurDuelLobbyPresenceMock,
  resolveKangurActorMock,
  requireActiveLearnerMock,
  logKangurServerEventMock,
} = vi.hoisted(() => ({
  listKangurDuelLobbyPresenceMock: vi.fn(),
  recordKangurDuelLobbyPresenceMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  requireActiveLearnerMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/duels/lobby-presence', () => ({
  listKangurDuelLobbyPresence: listKangurDuelLobbyPresenceMock,
  recordKangurDuelLobbyPresence: recordKangurDuelLobbyPresenceMock,
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
  requireActiveLearner: requireActiveLearnerMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import {
  getKangurDuelLobbyPresenceHandler,
  postKangurDuelLobbyPresenceHandler,
} from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-duels-presence-1',
    traceId: 'trace-duels-presence-1',
    correlationId: 'corr-duels-presence-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createGetRequest = (url: string): NextRequest =>
  new NextRequest(url, {
    method: 'GET',
  });

const createPostRequest = (url: string): NextRequest =>
  new NextRequest(url, {
    method: 'POST',
  });

describe('kangur duels lobby presence handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      actorType: 'learner',
    });
    requireActiveLearnerMock.mockReturnValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Ada',
      loginName: 'ada',
      status: 'active',
      legacyUserKey: null,
      aiTutor: null,
      createdAt: '2026-03-16T10:00:00.000Z',
      updatedAt: '2026-03-16T10:00:00.000Z',
    });
  });

  it('lists lobby presence entries for GET requests', async () => {
    listKangurDuelLobbyPresenceMock.mockResolvedValue({
      entries: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          lastSeenAt: '2026-03-16T12:00:00.000Z',
        },
      ],
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    const response = await getKangurDuelLobbyPresenceHandler(
      createGetRequest('http://localhost/api/kangur/duels/lobby-presence?limit=5'),
      createRequestContext()
    );

    expect(listKangurDuelLobbyPresenceMock).toHaveBeenCalledWith({ limit: 5 });
    expect(requireActiveLearnerMock).toHaveBeenCalled();
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.duels.lobby-presence',
        statusCode: 200,
        context: expect.objectContaining({ entries: 1 }),
      })
    );
    expect(response.status).toBe(200);
  });

  it('records lobby presence entries for POST requests', async () => {
    recordKangurDuelLobbyPresenceMock.mockResolvedValue({
      entries: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          lastSeenAt: '2026-03-16T12:00:00.000Z',
        },
      ],
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    const response = await postKangurDuelLobbyPresenceHandler(
      createPostRequest('http://localhost/api/kangur/duels/lobby-presence'),
      createRequestContext()
    );

    expect(recordKangurDuelLobbyPresenceMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'learner-1' }),
      {}
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.duels.lobby-presence',
        statusCode: 200,
      })
    );
    expect(response.status).toBe(200);
  });
});
