import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, forbiddenError } from '@/shared/errors/app-error';

const {
  resolveKangurActorMock,
  requireActiveLearnerMock,
  listKangurDuelLobbyChatMessagesMock,
  createKangurDuelLobbyChatMessageMock,
  logKangurServerEventMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  requireActiveLearnerMock: vi.fn(),
  listKangurDuelLobbyChatMessagesMock: vi.fn(),
  createKangurDuelLobbyChatMessageMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
  requireActiveLearner: requireActiveLearnerMock,
}));

vi.mock('@/features/kangur/duels/lobby-chat', () => ({
  listKangurDuelLobbyChatMessages: listKangurDuelLobbyChatMessagesMock,
  createKangurDuelLobbyChatMessage: createKangurDuelLobbyChatMessageMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { getKangurDuelLobbyChatHandler, postKangurDuelLobbyChatHandler } from './handler';

const createRequestContext = (body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-duels-lobby-chat-1',
    traceId: 'trace-duels-lobby-chat-1',
    correlationId: 'corr-duels-lobby-chat-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

const createGetRequest = (url = 'http://localhost/api/kangur/duels/lobby-chat'): NextRequest =>
  new NextRequest(url);

const createPostRequest = (body: unknown): NextRequest =>
  new NextRequest('http://localhost/api/kangur/duels/lobby-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('kangur duels lobby chat handler', () => {
  const learnerProfile = {
    id: 'learner-1',
    ownerUserId: 'parent-1',
    displayName: 'Ada',
    loginName: 'ada-child',
    status: 'active',
    legacyUserKey: 'ada@example.com',
    aiTutor: null,
    createdAt: '2026-03-16T10:00:00.000Z',
    updatedAt: '2026-03-16T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      ownerEmail: 'ada@example.com',
      ownerName: 'Ada',
      actorId: 'learner-1',
      actorType: 'learner',
      canManageLearners: false,
      role: 'user',
      activeLearner: learnerProfile,
      learners: [learnerProfile],
    });
    requireActiveLearnerMock.mockReturnValue(learnerProfile);
  });

  it('returns lobby chat messages for a learner', async () => {
    listKangurDuelLobbyChatMessagesMock.mockResolvedValue({
      messages: [
        {
          id: 'message-1',
          lobbyId: 'duels_lobby',
          senderId: 'learner-1',
          senderName: 'Ada',
          senderAvatarId: null,
          message: 'Hej!',
          createdAt: '2026-03-16T12:00:00.000Z',
        },
      ],
      serverTime: '2026-03-16T12:00:00.000Z',
      nextCursor: null,
    });

    const response = await getKangurDuelLobbyChatHandler(
      createGetRequest('http://localhost/api/kangur/duels/lobby-chat?limit=10'),
      createRequestContext()
    );

    expect(listKangurDuelLobbyChatMessagesMock).toHaveBeenCalledWith({ limit: 10 });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.duels.lobby-chat',
        statusCode: 200,
        context: expect.objectContaining({
          entries: 1,
          learnerId: 'learner-1',
          limit: 10,
        }),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      messages: [
        {
          id: 'message-1',
          lobbyId: 'duels_lobby',
          senderId: 'learner-1',
          senderName: 'Ada',
          senderAvatarId: null,
          message: 'Hej!',
          createdAt: '2026-03-16T12:00:00.000Z',
        },
      ],
      serverTime: '2026-03-16T12:00:00.000Z',
      nextCursor: null,
    });
  });

  it('rejects non-learner actors when listing lobby chat', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({
      ownerUserId: 'parent-1',
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'user',
      activeLearner: learnerProfile,
      learners: [learnerProfile],
    });

    await expect(
      getKangurDuelLobbyChatHandler(createGetRequest(), createRequestContext())
    ).rejects.toMatchObject(forbiddenError('Only learner accounts can access lobby chat.'));
    expect(listKangurDuelLobbyChatMessagesMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated lobby chat list requests', async () => {
    resolveKangurActorMock.mockRejectedValueOnce(authError('Authentication required.'));

    await expect(
      getKangurDuelLobbyChatHandler(createGetRequest(), createRequestContext())
    ).rejects.toThrow('Authentication required.');
    expect(listKangurDuelLobbyChatMessagesMock).not.toHaveBeenCalled();
  });

  it('creates lobby chat messages for a learner', async () => {
    createKangurDuelLobbyChatMessageMock.mockResolvedValue({
      message: {
        id: 'message-2',
        lobbyId: 'duels_lobby',
        senderId: 'learner-1',
        senderName: 'Ada',
        senderAvatarId: null,
        message: 'Czesc!',
        createdAt: '2026-03-16T12:10:00.000Z',
      },
      serverTime: '2026-03-16T12:10:00.000Z',
    });

    const response = await postKangurDuelLobbyChatHandler(
      createPostRequest({ message: 'Czesc!' }),
      createRequestContext({ message: 'Czesc!' })
    );

    expect(createKangurDuelLobbyChatMessageMock).toHaveBeenCalledWith(learnerProfile, {
      message: 'Czesc!',
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.duels.lobby-chat',
        statusCode: 201,
        context: expect.objectContaining({
          messageId: 'message-2',
          messageLength: 6,
        }),
      })
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      message: {
        id: 'message-2',
        lobbyId: 'duels_lobby',
        senderId: 'learner-1',
        senderName: 'Ada',
        senderAvatarId: null,
        message: 'Czesc!',
        createdAt: '2026-03-16T12:10:00.000Z',
      },
      serverTime: '2026-03-16T12:10:00.000Z',
    });
  });

  it('rejects non-learner actors when sending lobby chat messages', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({
      ownerUserId: 'parent-1',
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'user',
      activeLearner: learnerProfile,
      learners: [learnerProfile],
    });

    await expect(
      postKangurDuelLobbyChatHandler(
        createPostRequest({ message: 'Hej' }),
        createRequestContext({ message: 'Hej' })
      )
    ).rejects.toMatchObject(forbiddenError('Only learner accounts can access lobby chat.'));
    expect(createKangurDuelLobbyChatMessageMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated lobby chat send requests', async () => {
    resolveKangurActorMock.mockRejectedValueOnce(authError('Authentication required.'));

    await expect(
      postKangurDuelLobbyChatHandler(
        createPostRequest({ message: 'Hej' }),
        createRequestContext({ message: 'Hej' })
      )
    ).rejects.toThrow('Authentication required.');
    expect(createKangurDuelLobbyChatMessageMock).not.toHaveBeenCalled();
  });
});
