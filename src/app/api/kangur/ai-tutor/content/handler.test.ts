import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

const { getKangurAiTutorContentMock, upsertKangurAiTutorContentMock, resolveKangurActorMock } =
  vi.hoisted(() => ({
    getKangurAiTutorContentMock: vi.fn(),
    upsertKangurAiTutorContentMock: vi.fn(),
    resolveKangurActorMock: vi.fn(),
  }));

vi.mock('@/features/kangur/server/ai-tutor-content-repository', () => ({
  getKangurAiTutorContent: getKangurAiTutorContentMock,
  upsertKangurAiTutorContent: upsertKangurAiTutorContentMock,
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

import {
  getKangurAiTutorContentHandler,
  postKangurAiTutorContentHandler,
} from './handler';

const createRequestContext = (body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-ai-tutor-content-1',
    traceId: 'trace-kangur-ai-tutor-content-1',
    correlationId: 'corr-kangur-ai-tutor-content-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('kangur ai tutor content handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKangurAiTutorContentMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
    upsertKangurAiTutorContentMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
    resolveKangurActorMock.mockResolvedValue({
      actorId: 'admin-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'admin',
      ownerUserId: 'admin-1',
      ownerEmail: 'admin@example.com',
      ownerName: 'Admin',
      ownerEmailVerified: true,
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'admin-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'admin@example.com',
        createdAt: '2026-03-10T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
      learners: [],
    });
  });

  it('returns tutor content for the requested locale', async () => {
    const response = await getKangurAiTutorContentHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/content?locale=pl'),
      createRequestContext()
    );

    expect(getKangurAiTutorContentMock).toHaveBeenCalledWith('pl');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
  });

  it('allows admins to upsert tutor content', async () => {
    const payload = {
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      navigation: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.navigation,
        restoreTutorLabel: 'Przywróć AI Tutora',
      },
    };

    const response = await postKangurAiTutorContentHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/content', {
        method: 'POST',
      }),
      createRequestContext(payload)
    );

    expect(resolveKangurActorMock).toHaveBeenCalledTimes(1);
    expect(upsertKangurAiTutorContentMock).toHaveBeenCalledWith(payload);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
  });

  it('rejects non-admin actors from updating tutor content', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'user',
      ownerUserId: 'parent-1',
      ownerEmail: 'parent@example.com',
      ownerName: 'Parent',
      ownerEmailVerified: true,
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'parent@example.com',
        createdAt: '2026-03-10T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
      learners: [],
    });

    await expect(
      postKangurAiTutorContentHandler(
        new NextRequest('http://localhost/api/kangur/ai-tutor/content', {
          method: 'POST',
        }),
        createRequestContext(DEFAULT_KANGUR_AI_TUTOR_CONTENT)
      )
    ).rejects.toThrow('Only admins can update Kangur AI Tutor content.');
  });
});
