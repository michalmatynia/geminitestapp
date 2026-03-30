import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getKangurLearnerActivityRepositoryMock,
  publishKangurLearnerActivityUpdateMock,
  resolveKangurActorMock,
  saveActivityMock,
} = vi.hoisted(() => ({
  getKangurLearnerActivityRepositoryMock: vi.fn(),
  publishKangurLearnerActivityUpdateMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  saveActivityMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurLearnerActivityRepository: getKangurLearnerActivityRepositoryMock,
  resolveKangurActor: resolveKangurActorMock,
  requireActiveLearner: (actor: { activeLearner?: unknown }) => actor.activeLearner,
}));

vi.mock('@/features/kangur/services/learner-activity-stream-publisher', () => ({
  publishKangurLearnerActivityUpdate: publishKangurLearnerActivityUpdateMock,
}));

import { learnerActivityPostHandler } from '@/app/api/kangur/[[...path]]/routing/routing.learner';

describe('kangur learner activity route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKangurLearnerActivityRepositoryMock.mockResolvedValue({
      getActivity: vi.fn(),
      saveActivity: saveActivityMock,
    });
    resolveKangurActorMock.mockResolvedValue({
      actorType: 'learner',
      activeLearner: {
        id: 'learner-1',
      },
    });
  });

  it('accepts JSON bodies through the wrapped POST route without re-reading the request stream', async () => {
    saveActivityMock.mockResolvedValue({
      learnerId: 'learner-1',
      kind: 'lesson',
      title: 'Fraction warmup',
      href: '/kangur/lessons/fractions',
      startedAt: '2026-03-26T00:00:00.000Z',
      updatedAt: '2026-03-26T00:01:00.000Z',
    });

    const response = await learnerActivityPostHandler(
      new NextRequest('http://localhost/api/kangur/learner-activity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'lesson',
          title: 'Fraction warmup',
          href: '/kangur/lessons/fractions',
        }),
      })
    );

    expect(saveActivityMock).toHaveBeenCalledWith('learner-1', {
      kind: 'lesson',
      title: 'Fraction warmup',
      href: '/kangur/lessons/fractions',
    });
    expect(publishKangurLearnerActivityUpdateMock).toHaveBeenCalledWith(
      'learner-1',
      expect.objectContaining({
        isOnline: false,
        snapshot: expect.objectContaining({
          learnerId: 'learner-1',
          kind: 'lesson',
        }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        learnerId: 'learner-1',
        kind: 'lesson',
      })
    );
  });
});
