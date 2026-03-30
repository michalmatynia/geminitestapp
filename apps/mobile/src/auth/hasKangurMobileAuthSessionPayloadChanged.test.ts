import { createDefaultKangurAiTutorLearnerMood } from '@kangur/contracts';
import { describe, expect, it } from 'vitest';

import { hasKangurMobileAuthSessionPayloadChanged } from './hasKangurMobileAuthSessionPayloadChanged';

const createAnonymousSession = () => ({
  lastResolvedAt: '2026-03-20T00:00:00.000Z',
  source: 'native-learner-session' as const,
  status: 'anonymous' as const,
  user: null,
});

const createAuthenticatedSession = (overrides: {
  source?: 'native-learner-session' | 'native-development';
} = {}) => ({
  lastResolvedAt: '2026-03-20T00:00:00.000Z',
  source: overrides.source ?? ('native-learner-session' as const),
  status: 'authenticated' as const,
  user: {
    id: 'parent-1',
    full_name: 'Ada Parent',
    email: 'ada.parent@example.com',
    role: 'user' as const,
    actorType: 'parent' as const,
    canManageLearners: true,
    ownerUserId: null,
    ownerEmailVerified: true,
    activeLearner: {
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Ada Learner',
      loginName: 'ada',
      status: 'active' as const,
      legacyUserKey: null,
      aiTutor: createDefaultKangurAiTutorLearnerMood(),
      createdAt: '2026-03-20T00:00:00.000Z',
      updatedAt: '2026-03-20T00:00:00.000Z',
    },
    learners: [],
  },
});

describe('hasKangurMobileAuthSessionPayloadChanged', () => {
  it('returns false when only lastResolvedAt changes', () => {
    const previousSession = createAuthenticatedSession();
    const nextSession = {
      ...createAuthenticatedSession(),
      lastResolvedAt: '2026-03-21T00:00:00.000Z',
    };

    expect(
      hasKangurMobileAuthSessionPayloadChanged(previousSession, nextSession),
    ).toBe(false);
  });

  it('returns true when auth status changes', () => {
    expect(
      hasKangurMobileAuthSessionPayloadChanged(
        createAnonymousSession(),
        createAuthenticatedSession(),
      ),
    ).toBe(true);
  });

  it('returns true when the auth source changes', () => {
    expect(
      hasKangurMobileAuthSessionPayloadChanged(
        createAuthenticatedSession({
          source: 'native-learner-session',
        }),
        createAuthenticatedSession({
          source: 'native-development',
        }),
      ),
    ).toBe(true);
  });

  it('returns true when nested user data changes', () => {
    const previousSession = createAuthenticatedSession();
    const nextSession = {
      ...createAuthenticatedSession(),
      user: {
        ...createAuthenticatedSession().user,
        activeLearner: {
          ...createAuthenticatedSession().user.activeLearner,
          displayName: 'Ada Updated',
        },
      },
    };

    expect(
      hasKangurMobileAuthSessionPayloadChanged(previousSession, nextSession),
    ).toBe(true);
  });
});
