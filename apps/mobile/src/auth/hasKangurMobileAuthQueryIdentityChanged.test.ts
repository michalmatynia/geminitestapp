import { createDefaultKangurAiTutorLearnerMood } from '@kangur/contracts/kangur-ai-tutor-mood';
import { describe, expect, it } from 'vitest';

import { hasKangurMobileAuthQueryIdentityChanged } from './hasKangurMobileAuthQueryIdentityChanged';

const createAnonymousSession = () => ({
  lastResolvedAt: '2026-03-20T00:00:00.000Z',
  source: 'native-learner-session' as const,
  status: 'anonymous' as const,
  user: null,
});

const createAuthenticatedSession = (overrides: {
  activeLearnerId?: string | null;
  email?: string | null;
} = {}) => ({
  lastResolvedAt: '2026-03-20T00:00:00.000Z',
  source: 'native-learner-session' as const,
  status: 'authenticated' as const,
  user: {
    id: 'parent-1',
    full_name: 'Ada Parent',
    email: overrides.email ?? 'ada.parent@example.com',
    role: 'user' as const,
    actorType: 'parent' as const,
    canManageLearners: true,
    ownerUserId: null,
    ownerEmailVerified: true,
    activeLearner:
      overrides.activeLearnerId === null
        ? null
        : {
            id: overrides.activeLearnerId ?? 'learner-1',
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

describe('hasKangurMobileAuthQueryIdentityChanged', () => {
  it('returns false when only non-query auth fields change', () => {
    const previousSession = createAuthenticatedSession();
    const nextSession = {
      ...createAuthenticatedSession(),
      lastResolvedAt: '2026-03-21T00:00:00.000Z',
      user: {
        ...createAuthenticatedSession().user,
        full_name: 'Ada Learner Updated',
      },
    };

    expect(
      hasKangurMobileAuthQueryIdentityChanged(previousSession, nextSession),
    ).toBe(false);
  });

  it('returns true when auth status changes', () => {
    expect(
      hasKangurMobileAuthQueryIdentityChanged(
        createAnonymousSession(),
        createAuthenticatedSession(),
      ),
    ).toBe(true);
  });

  it('returns true when the active learner scope changes', () => {
    expect(
      hasKangurMobileAuthQueryIdentityChanged(
        createAuthenticatedSession({
          activeLearnerId: 'learner-1',
        }),
        createAuthenticatedSession({
          activeLearnerId: 'learner-2',
        }),
      ),
    ).toBe(true);
  });

  it('returns true when the fallback email scope changes', () => {
    expect(
      hasKangurMobileAuthQueryIdentityChanged(
        createAuthenticatedSession({
          activeLearnerId: null,
          email: 'one@example.com',
        }),
        createAuthenticatedSession({
          activeLearnerId: null,
          email: 'two@example.com',
        }),
      ),
    ).toBe(true);
  });
});
