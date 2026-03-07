import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { KANGUR_AI_TUTOR_SETTINGS_KEY } from '@/features/kangur/settings-ai-tutor';
import { KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY } from '@/features/kangur/server/ai-tutor-usage';

const {
  resolveKangurActorMock,
  readStoredSettingValueMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
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
    });

    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            teachingAgentId: 'teacher-1',
            agentPersonaId: 'persona-1',
            playwrightPersonaId: null,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: 5,
          },
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
            teachingAgentId: null,
            agentPersonaId: null,
            playwrightPersonaId: null,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: null,
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
      message: 'AI tutor is not enabled for this learner.',
      httpStatus: 400,
    });
  });
});
