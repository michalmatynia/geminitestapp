import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { probeKangurLessonNarrationBackendMock, resolveKangurActorMock, logKangurServerEventMock } =
  vi.hoisted(() => ({
    probeKangurLessonNarrationBackendMock: vi.fn(),
    resolveKangurActorMock: vi.fn(),
    logKangurServerEventMock: vi.fn(),
  }));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/features/kangur/tts/server', () => ({
  probeKangurLessonNarrationBackend: probeKangurLessonNarrationBackendMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { postKangurTtsProbeHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-tts-probe-1',
    traceId: 'trace-kangur-tts-probe-1',
    correlationId: 'corr-kangur-tts-probe-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createPostRequest = (body: string): NextRequest =>
  new NextRequest('http://localhost/api/kangur/tts/probe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

describe('kangur tts probe handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      ownerEmail: 'ada@example.com',
      ownerName: 'Ada',
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
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

    probeKangurLessonNarrationBackendMock.mockResolvedValue({
      ok: false,
      stage: 'openai_speech',
      voice: 'coral',
      model: 'gpt-4o-mini-tts',
      checkedAt: '2026-03-08T06:00:00.000Z',
      message: '429 Your account is not active, please check your billing details on our website.',
      errorName: 'KangurLessonTtsGenerationError',
      errorStatus: 429,
      errorCode: 'billing_not_active',
    });
  });

  it('returns narrator probe diagnostics for a parent actor', async () => {
    const response = await postKangurTtsProbeHandler(
      createPostRequest(
        JSON.stringify({
          voice: 'coral',
          locale: 'pl-PL',
          text: 'To jest test narratora Kangur.',
        })
      ),
      createRequestContext()
    );

    expect(resolveKangurActorMock).toHaveBeenCalledTimes(1);
    expect(probeKangurLessonNarrationBackendMock).toHaveBeenCalledWith({
      voice: 'coral',
      locale: 'pl-PL',
      text: 'To jest test narratora Kangur.',
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.tts.probe.failed',
        level: 'warn',
        context: expect.objectContaining({
          stage: 'openai_speech',
          errorStatus: 429,
          errorCode: 'billing_not_active',
        }),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      stage: 'openai_speech',
      voice: 'coral',
      model: 'gpt-4o-mini-tts',
      checkedAt: '2026-03-08T06:00:00.000Z',
      message: '429 Your account is not active, please check your billing details on our website.',
      errorName: 'KangurLessonTtsGenerationError',
      errorStatus: 429,
      errorCode: 'billing_not_active',
    });
  });

  it('rejects learner actors from probing server narration', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({
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

    await expect(
      postKangurTtsProbeHandler(
        createPostRequest(
          JSON.stringify({
            voice: 'coral',
            locale: 'pl-PL',
            text: 'To jest test narratora Kangur.',
          })
        ),
        createRequestContext()
      )
    ).rejects.toThrow('Only parents or admins can probe Kangur server narration.');
  });
});
