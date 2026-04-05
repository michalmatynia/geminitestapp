import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError } from '@/shared/errors/app-error';

const {
  inspectKangurLessonNarrationAudioMock,
  resolveKangurActorMock,
  resolveKangurTtsContextRegistryEnvelopeMock,
} = vi.hoisted(() => ({
  inspectKangurLessonNarrationAudioMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  resolveKangurTtsContextRegistryEnvelopeMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/features/kangur/tts/server', () => ({
  inspectKangurLessonNarrationAudio: inspectKangurLessonNarrationAudioMock,
}));

vi.mock('@/features/kangur/tts/context-registry/server', () => ({
  resolveKangurTtsContextRegistryEnvelope: resolveKangurTtsContextRegistryEnvelopeMock,
}));

import { postKangurTtsStatusHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-tts-status-1',
    traceId: 'trace-kangur-tts-status-1',
    correlationId: 'corr-kangur-tts-status-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createPostRequest = (body: string): NextRequest =>
  new NextRequest('http://localhost/api/kangur/tts/status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

describe('kangur tts status handler', () => {
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

    inspectKangurLessonNarrationAudioMock.mockResolvedValue({
      state: 'ready',
      voice: 'coral',
      latestCreatedAt: '2026-03-06T10:05:00.000Z',
      message: 'Cached audio is available for this lesson draft.',
      segments: [
        {
          id: 'clock-segment-1',
          text: 'Nauka zegara.',
          audioUrl: '/uploads/kangur/tts/example.mp3',
          createdAt: '2026-03-06T10:05:00.000Z',
        },
      ],
    });
    resolveKangurTtsContextRegistryEnvelopeMock.mockResolvedValue({
      refs: [{ id: 'page:kangur-admin-lessons-manager', kind: 'static_node' }],
      engineVersion: 'page-context:v1',
    });
  });

  it('returns cached narration status for an authenticated learner', async () => {
    const response = await postKangurTtsStatusHandler(
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
          contextRegistry: {
            refs: [{ id: 'page:kangur-admin-lessons-manager', kind: 'static_node' }],
            engineVersion: 'page-context:v1',
          },
        })
      ),
      createRequestContext()
    );

    expect(resolveKangurActorMock).toHaveBeenCalledTimes(1);
    expect(inspectKangurLessonNarrationAudioMock).toHaveBeenCalledWith({
      script: {
        lessonId: 'clock',
        title: 'Nauka zegara',
        description: 'Opis lekcji',
        locale: 'pl-PL',
        segments: [{ id: 'clock-segment-1', text: 'Nauka zegara.' }],
      },
      voice: 'coral',
      contextRegistry: {
        refs: [{ id: 'page:kangur-admin-lessons-manager', kind: 'static_node' }],
        engineVersion: 'page-context:v1',
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      state: 'ready',
      voice: 'coral',
      latestCreatedAt: '2026-03-06T10:05:00.000Z',
      message: 'Cached audio is available for this lesson draft.',
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
      postKangurTtsStatusHandler(createPostRequest('{invalid-json'), createRequestContext())
    ).rejects.toThrow('Invalid JSON payload.');
  });

  it('allows unauthenticated narration status requests', async () => {
    resolveKangurActorMock.mockRejectedValueOnce(authError('Authentication required.'));

    const response = await postKangurTtsStatusHandler(
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
    );

    expect(response.status).toBe(200);
    expect(inspectKangurLessonNarrationAudioMock).toHaveBeenCalledTimes(1);
  });
});
