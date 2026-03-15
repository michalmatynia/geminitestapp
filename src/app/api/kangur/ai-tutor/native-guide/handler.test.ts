import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  type KangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getKangurAiTutorNativeGuideStoreMock,
  upsertKangurAiTutorNativeGuideStoreMock,
  resolveKangurActorMock,
  readStoredSettingValueMock,
} = vi.hoisted(() => ({
  getKangurAiTutorNativeGuideStoreMock: vi.fn(),
  upsertKangurAiTutorNativeGuideStoreMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
}));

vi.mock('@/features/kangur/server/ai-tutor-native-guide-repository', () => ({
  getKangurAiTutorNativeGuideStore: getKangurAiTutorNativeGuideStoreMock,
  upsertKangurAiTutorNativeGuideStore: upsertKangurAiTutorNativeGuideStoreMock,
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
  requireActiveLearner: (actor: { activeLearner?: unknown }) => actor.activeLearner,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
}));

import {
  getKangurAiTutorNativeGuideHandler,
  postKangurAiTutorNativeGuideHandler,
} from './handler';

const createRequestContext = (body?: unknown, query?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-ai-tutor-native-guide-1',
    traceId: 'trace-kangur-ai-tutor-native-guide-1',
    correlationId: 'corr-kangur-ai-tutor-native-guide-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
    query,
  }) as ApiHandlerContext;

const cloneDefaultStore = (): KangurAiTutorNativeGuideStore =>
  JSON.parse(JSON.stringify(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE));

describe('kangur ai tutor native guide handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE);
    upsertKangurAiTutorNativeGuideStoreMock.mockResolvedValue(
      DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE
    );
    readStoredSettingValueMock.mockResolvedValue(null);
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

  it('returns native guide store for the requested locale', async () => {
    const response = await getKangurAiTutorNativeGuideHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/native-guide?locale=pl'),
      createRequestContext(undefined, { locale: 'pl' })
    );

    expect(getKangurAiTutorNativeGuideStoreMock).toHaveBeenCalledWith('pl');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE);
  });

  it('allows admins to upsert native guide store', async () => {
    const payload = cloneDefaultStore();
    payload.entries[0] = {
      ...payload.entries[0]!,
      title: 'Ekran lekcji v2',
    };

    const response = await postKangurAiTutorNativeGuideHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/native-guide', {
        method: 'POST',
      }),
      createRequestContext(payload)
    );

    expect(resolveKangurActorMock).toHaveBeenCalledTimes(1);
    expect(upsertKangurAiTutorNativeGuideStoreMock).toHaveBeenCalledWith(payload);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE);
  });

  it('rejects non-admin actors from updating native guides', async () => {
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
      postKangurAiTutorNativeGuideHandler(
        new NextRequest('http://localhost/api/kangur/ai-tutor/native-guide', {
          method: 'POST',
        }),
        createRequestContext(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE)
      )
    ).rejects.toThrow('Only admins can update Kangur AI Tutor native guides.');
  });

  it('rejects blocking onboarding validation issues before persisting native guides', async () => {
    const payload = cloneDefaultStore();
    payload.entries[0] = {
      ...payload.entries[0]!,
      shortDescription: 'TODO uzupełnić opis sekcji.',
    };

    await expect(
      postKangurAiTutorNativeGuideHandler(
        new NextRequest('http://localhost/api/kangur/ai-tutor/native-guide', {
          method: 'POST',
        }),
        createRequestContext(payload)
      )
    ).rejects.toThrow('AI Tutor onboarding validation failed.');
    expect(upsertKangurAiTutorNativeGuideStoreMock).not.toHaveBeenCalled();
  });
});
