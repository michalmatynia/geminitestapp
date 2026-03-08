import { describe, expect, it } from 'vitest';
import { createDefaultKangurAiTutorLearnerMood } from '@kangur/contracts';

import { resolveKangurMobileScoreScope } from './mobileScoreScope';

describe('resolveKangurMobileScoreScope', () => {
  it('prefers the active learner id when available', () => {
    expect(
      resolveKangurMobileScoreScope({
        id: 'user-1',
        full_name: 'Parent Demo',
        email: 'parent@example.com',
        role: 'user',
        actorType: 'parent',
        canManageLearners: true,
        ownerUserId: null,
        activeLearner: {
          id: 'learner-1',
          ownerUserId: 'user-1',
          displayName: 'Ada',
          loginName: 'ada',
          status: 'active',
          legacyUserKey: null,
          aiTutor: createDefaultKangurAiTutorLearnerMood(),
          createdAt: '2026-03-20T00:00:00.000Z',
          updatedAt: '2026-03-20T00:00:00.000Z',
        },
        learners: [],
      }),
    ).toEqual({
      identityKey: 'learner:learner-1',
      query: {
        learner_id: 'learner-1',
      },
    });
  });

  it('falls back to the normalized email when there is no active learner', () => {
    expect(
      resolveKangurMobileScoreScope({
        id: 'user-1',
        full_name: 'Parent Demo',
        email: ' Parent@Example.com ',
        role: 'user',
        actorType: 'parent',
        canManageLearners: true,
        ownerUserId: null,
        activeLearner: null,
        learners: [],
      }),
    ).toEqual({
      identityKey: 'email:parent@example.com',
      query: {
        created_by: 'parent@example.com',
      },
    });
  });

  it('returns null when neither learner id nor email is available', () => {
    expect(
      resolveKangurMobileScoreScope({
        id: 'user-1',
        full_name: 'Learner Demo',
        email: null,
        role: 'user',
        actorType: 'learner',
        canManageLearners: false,
        ownerUserId: 'parent-1',
        activeLearner: null,
        learners: [],
      }),
    ).toBeNull();
  });
});
