import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import { KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY } from '@/features/kangur/server/ai-tutor-usage';

const {
  resolveKangurActorMock,
  readStoredSettingValueMock,
  getKangurAiTutorContentMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
  getKangurAiTutorContentMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-content-repository', () => ({
  getKangurAiTutorContent: getKangurAiTutorContentMock,
}));

import { getKangurAiTutorUsageHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-ai-tutor-usage-1',
    traceId: 'trace-kangur-ai-tutor-usage-1',
    correlationId: 'corr-kangur-ai-tutor-usage-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur ai tutor usage handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));

    resolveKangurActorMock.mockResolvedValue({
      activeLearner: {
        id: 'learner-1',
      },
      ownerEmailVerified: true,
    });
    getKangurAiTutorContentMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_CONTENT);

    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
          },
        });
      }
      if (key === KANGUR_AI_TUTOR_APP_SETTINGS_KEY) {
        return JSON.stringify({
          agentPersonaId: 'persona-1',
          motionPresetId: 'tablet',
          dailyMessageLimit: 5,
        });
      }
      if (key === KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            dateKey: '2026-03-07',
            messageCount: 2,
            updatedAt: '2026-03-07T09:00:00.000Z',
          },
        });
      }
      return null;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the current per-learner tutor usage snapshot for today', async () => {
    const response = await getKangurAiTutorUsageHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/usage'),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      usage: {
        dateKey: '2026-03-07',
        messageCount: 2,
        dailyMessageLimit: 5,
        remainingMessages: 3,
      },
    });
  });

  it('rejects usage reads when the tutor is disabled for the learner', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: false,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
          },
        });
      }
      return null;
    });

    await expect(
      getKangurAiTutorUsageHandler(
        new NextRequest('http://localhost/api/kangur/ai-tutor/usage'),
        createRequestContext()
      )
    ).rejects.toMatchObject({
      message: DEFAULT_KANGUR_AI_TUTOR_CONTENT.usageApi.availabilityErrors.disabled,
      httpStatus: 400,
    });
  });

  it('rejects usage reads when the parent email is not verified yet', async () => {
    resolveKangurActorMock.mockResolvedValue({
      activeLearner: {
        id: 'learner-1',
      },
      ownerEmailVerified: false,
    });

    await expect(
      getKangurAiTutorUsageHandler(
        new NextRequest('http://localhost/api/kangur/ai-tutor/usage'),
        createRequestContext()
      )
    ).rejects.toMatchObject({
      message: DEFAULT_KANGUR_AI_TUTOR_CONTENT.usageApi.availabilityErrors.emailUnverified,
      httpStatus: 400,
    });
  });
});
