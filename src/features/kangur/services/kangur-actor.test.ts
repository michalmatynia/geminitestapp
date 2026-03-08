import { NextRequest, type NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  findAuthUserByIdMock,
  ensureDefaultKangurLearnerForOwnerMock,
  getKangurLearnerByIdMock,
  listKangurLearnersByOwnerMock,
  readKangurLearnerSessionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findAuthUserByIdMock: vi.fn(),
  ensureDefaultKangurLearnerForOwnerMock: vi.fn(),
  getKangurLearnerByIdMock: vi.fn(),
  listKangurLearnersByOwnerMock: vi.fn(),
  readKangurLearnerSessionMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
  findAuthUserById: findAuthUserByIdMock,
}));

vi.mock('./kangur-learner-repository', () => ({
  ensureDefaultKangurLearnerForOwner: ensureDefaultKangurLearnerForOwnerMock,
  getKangurLearnerById: getKangurLearnerByIdMock,
  listKangurLearnersByOwner: listKangurLearnersByOwnerMock,
}));

vi.mock('./kangur-learner-session', async () => {
  const actual = await vi.importActual<typeof import('./kangur-learner-session')>(
    './kangur-learner-session',
  );
  return {
    ...actual,
    readKangurLearnerSession: readKangurLearnerSessionMock,
  };
});

import { resolveKangurActor, toKangurAuthUser } from './kangur-actor';

describe('resolveKangurActor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
    listKangurLearnersByOwnerMock.mockResolvedValue([]);
    ensureDefaultKangurLearnerForOwnerMock.mockResolvedValue(undefined);
  });

  it('resolves a learner actor from the signed learner session when no web auth session exists', async () => {
    readKangurLearnerSessionMock.mockReturnValue({
      learnerId: 'learner-1',
      ownerUserId: 'parent-1',
      exp: Date.now() + 60_000,
    });
    getKangurLearnerByIdMock.mockResolvedValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Ada Learner',
      loginName: 'ada',
      status: 'active',
      legacyUserKey: null,
      aiTutor: {
        confidence: 0,
        curiosity: 0,
        encouragement: 0,
        momentum: 0,
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      createdAt: '2026-03-20T00:00:00.000Z',
      updatedAt: '2026-03-20T00:00:00.000Z',
    });
    findAuthUserByIdMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      name: 'Parent Demo',
    });

    const actor = await resolveKangurActor(
      new NextRequest('http://localhost/api/kangur/auth/me'),
    );

    expect(actor).toMatchObject({
      actorId: 'learner-1',
      actorType: 'learner',
      canManageLearners: false,
      ownerUserId: 'parent-1',
      ownerEmail: 'parent@example.com',
      ownerName: 'Parent Demo',
      activeLearner: expect.objectContaining({
        id: 'learner-1',
        displayName: 'Ada Learner',
      }),
      learners: [
        expect.objectContaining({
          id: 'learner-1',
        }),
      ],
    });
    expect(getKangurLearnerByIdMock).toHaveBeenCalledWith('learner-1');
    expect(findAuthUserByIdMock).toHaveBeenCalledWith('parent-1');
  });

  it('maps learner actors into Kangur auth users without exposing owner email as learner email', async () => {
    const user = toKangurAuthUser({
      actorId: 'learner-1',
      actorType: 'learner',
      canManageLearners: false,
      ownerUserId: 'parent-1',
      ownerEmail: 'parent@example.com',
      ownerName: 'Parent Demo',
      role: 'user',
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada Learner',
        loginName: 'ada',
        status: 'active',
        legacyUserKey: null,
        aiTutor: {
          confidence: 0,
          curiosity: 0,
          encouragement: 0,
          momentum: 0,
          updatedAt: '2026-03-20T00:00:00.000Z',
        },
        createdAt: '2026-03-20T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      learners: [
        {
          id: 'learner-1',
          ownerUserId: 'parent-1',
          displayName: 'Ada Learner',
          loginName: 'ada',
          status: 'active',
          legacyUserKey: null,
          aiTutor: {
            confidence: 0,
            curiosity: 0,
            encouragement: 0,
            momentum: 0,
            updatedAt: '2026-03-20T00:00:00.000Z',
          },
          createdAt: '2026-03-20T00:00:00.000Z',
          updatedAt: '2026-03-20T00:00:00.000Z',
        },
      ],
    });

    expect(user).toMatchObject({
      id: 'learner-1',
      full_name: 'Ada Learner',
      email: null,
      actorType: 'learner',
      ownerUserId: 'parent-1',
      activeLearner: expect.objectContaining({
        id: 'learner-1',
      }),
    });
  });
});
