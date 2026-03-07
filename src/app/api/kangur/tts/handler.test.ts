import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { ensureKangurLessonNarrationAudioMock, resolveKangurActorMock, logKangurServerEventMock } =
  vi.hoisted(() => ({
    ensureKangurLessonNarrationAudioMock: vi.fn(),
    resolveKangurActorMock: vi.fn(),
    logKangurServerEventMock: vi.fn(),
  }));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/features/kangur/tts/server', () => ({
  ensureKangurLessonNarrationAudio: ensureKangurLessonNarrationAudioMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { postKangurTtsHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-tts-1',
    traceId: 'trace-kangur-tts-1',
    correlationId: 'corr-kangur-tts-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createPostRequest = (body: string): NextRequest =>
  new NextRequest('http://localhost/api/kangur/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

describe('kangur tts handler', () => {
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
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'ada@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
      },
      learners: [],
    });

    ensureKangurLessonNarrationAudioMock.mockResolvedValue({
      mode: 'audio',
      voice: 'coral',
      segments: [
        {
          id: 'clock-segment-1',
          text: 'Nauka zegara.',
          audioUrl: '/uploads/kangur/tts/example.mp3',
          createdAt: '2026-03-06T10:05:00.000Z',
        },
      ],
    });
  });

  it('generates or reuses audio for an authenticated learner', async () => {
    const response = await postKangurTtsHandler(
      createPostRequest(
        JSON.stringify({
          script: {
            lessonId: 'clock',
            title: 'Nauka zegara',
            description: 'Opis lekcji',
            locale: 'pl-PL',
            segments: [{ id: 'clock-segment-1', text: 'Nauka zegara.' }],
          },
          voice: 'coral',
        })
      ),
      createRequestContext()
    );

    expect(resolveKangurActorMock).toHaveBeenCalledTimes(1);
    expect(ensureKangurLessonNarrationAudioMock).toHaveBeenCalledWith({
      script: {
        lessonId: 'clock',
        title: 'Nauka zegara',
        description: 'Opis lekcji',
        locale: 'pl-PL',
        segments: [{ id: 'clock-segment-1', text: 'Nauka zegara.' }],
      },
      voice: 'coral',
      forceRegenerate: false,
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.tts.generate',
        service: 'kangur.tts',
        statusCode: 200,
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mode: 'audio',
      voice: 'coral',
      segments: [
        {
          id: 'clock-segment-1',
          text: 'Nauka zegara.',
          audioUrl: '/uploads/kangur/tts/example.mp3',
          createdAt: '2026-03-06T10:05:00.000Z',
        },
      ],
    });
  });

  it('rejects invalid json payloads', async () => {
    await expect(
      postKangurTtsHandler(createPostRequest('{invalid-json'), createRequestContext())
    ).rejects.toThrow('Invalid JSON payload.');
  });

  it('emits a dedicated fallback log when browser narration is used', async () => {
    ensureKangurLessonNarrationAudioMock.mockResolvedValueOnce({
      mode: 'fallback',
      reason: 'tts_unavailable',
      message: 'Neural narration could not be prepared right now.',
      segments: [
        {
          id: 'clock-segment-1',
          text: 'Nauka zegara.',
        },
      ],
    });

    const response = await postKangurTtsHandler(
      createPostRequest(
        JSON.stringify({
          script: {
            lessonId: 'clock',
            title: 'Nauka zegara',
            description: 'Opis lekcji',
            locale: 'pl-PL',
            segments: [{ id: 'clock-segment-1', text: 'Nauka zegara.' }],
          },
          voice: 'coral',
        })
      ),
      createRequestContext()
    );

    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.tts.fallback',
        level: 'warn',
        context: expect.objectContaining({
          reason: 'tts_unavailable',
          segmentCount: 1,
        }),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        mode: 'fallback',
        reason: 'tts_unavailable',
      })
    );
  });

  it('rejects unauthenticated access', async () => {
    resolveKangurActorMock.mockRejectedValue(new Error('Authentication required.'));

    await expect(
      postKangurTtsHandler(
        createPostRequest(
          JSON.stringify({
            script: {
              lessonId: 'clock',
              title: 'Nauka zegara',
              locale: 'pl-PL',
              segments: [{ id: 'clock-segment-1', text: 'Nauka zegara.' }],
            },
            voice: 'coral',
          })
        ),
        createRequestContext()
      )
    ).rejects.toThrow('Authentication required.');
  });
});
