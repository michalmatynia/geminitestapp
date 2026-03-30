import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  readTolerantServerAuthSessionMock,
  registerKangurGuestAiTutorIntroAppearanceMock,
  readKangurLearnerSessionMock,
} = vi.hoisted(() => ({
  readTolerantServerAuthSessionMock: vi.fn(),
  registerKangurGuestAiTutorIntroAppearanceMock: vi.fn(),
  readKangurLearnerSessionMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  extractClientIp: () => '203.0.113.10',
  readTolerantServerAuthSession: readTolerantServerAuthSessionMock,
}));

vi.mock('@/features/kangur/server/guest-ai-tutor-intro', () => ({
  registerKangurGuestAiTutorIntroAppearance: registerKangurGuestAiTutorIntroAppearanceMock,
}));

vi.mock('@/features/kangur/services/kangur-learner-session', () => ({
  readKangurLearnerSession: readKangurLearnerSessionMock,
}));

import { getKangurAiTutorGuestIntroHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-ai-tutor-guest-intro-1',
    traceId: 'trace-kangur-ai-tutor-guest-intro-1',
    correlationId: 'corr-kangur-ai-tutor-guest-intro-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur ai tutor guest intro handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readTolerantServerAuthSessionMock.mockResolvedValue(null);
    readKangurLearnerSessionMock.mockReturnValue(null);
  });

  it('shows the prompt on a first anonymous appearance', async () => {
    registerKangurGuestAiTutorIntroAppearanceMock.mockResolvedValue({
      shouldShow: true,
      reason: 'first_visit',
    });

    const response = await getKangurAiTutorGuestIntroHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/guest-intro', {
        headers: {
          'user-agent': 'Vitest',
        },
      }),
      createRequestContext()
    );

    expect(registerKangurGuestAiTutorIntroAppearanceMock).toHaveBeenCalledWith({
      ip: '203.0.113.10',
      userAgent: 'Vitest',
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      shouldShow: true,
      reason: 'first_visit',
    });
  });

  it('suppresses the prompt when a parent session exists', async () => {
    readTolerantServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'parent-1',
      },
    });

    const response = await getKangurAiTutorGuestIntroHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/guest-intro'),
      createRequestContext()
    );

    expect(registerKangurGuestAiTutorIntroAppearanceMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      shouldShow: false,
      reason: 'authenticated',
    });
  });

  it('suppresses the prompt when a learner session exists', async () => {
    readKangurLearnerSessionMock.mockReturnValue({
      learnerId: 'learner-1',
      ownerUserId: 'parent-1',
      exp: Date.now() + 60_000,
    });

    const response = await getKangurAiTutorGuestIntroHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/guest-intro'),
      createRequestContext()
    );

    expect(registerKangurGuestAiTutorIntroAppearanceMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      shouldShow: false,
      reason: 'authenticated',
    });
  });
});
