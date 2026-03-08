import { describe, expect, it } from 'vitest';

import { getKangurHomeAuthBoundaryViewModel } from './homeAuthBoundary';

describe('getKangurHomeAuthBoundaryViewModel', () => {
  it('returns restoring labels and hides the learner form while auth is rehydrating', () => {
    expect(
      getKangurHomeAuthBoundaryViewModel({
        authError: null,
        developerAutoSignInEnabled: false,
        hasAttemptedDeveloperAutoSignIn: false,
        isLoadingAuth: true,
        session: {
          lastResolvedAt: '2026-03-20T00:00:00.000Z',
          source: 'native-learner-session',
          status: 'anonymous',
          user: null,
        },
        supportsLearnerCredentials: true,
      }),
    ).toEqual({
      developerAutoSignInLabel: null,
      isRestoringLearnerSession: true,
      showLearnerCredentialsForm: false,
      statusLabel: 'restoring',
      userLabel: 'restoring learner session',
    });
  });

  it('shows the learner sign-in form once auth restoration has finished', () => {
    expect(
      getKangurHomeAuthBoundaryViewModel({
        authError: null,
        developerAutoSignInEnabled: false,
        hasAttemptedDeveloperAutoSignIn: false,
        isLoadingAuth: false,
        session: {
          lastResolvedAt: '2026-03-20T00:00:00.000Z',
          source: 'native-learner-session',
          status: 'anonymous',
          user: null,
        },
        supportsLearnerCredentials: true,
      }),
    ).toEqual({
      developerAutoSignInLabel: null,
      isRestoringLearnerSession: false,
      showLearnerCredentialsForm: true,
      statusLabel: 'anonymous',
      userLabel: 'anonymous',
    });
  });

  it('reports a failed developer auto sign-in attempt once auth settles with an error', () => {
    expect(
      getKangurHomeAuthBoundaryViewModel({
        authError:
          'Learner sign-in did not produce a persisted mobile session. Check cookie/session support for the current device runtime.',
        developerAutoSignInEnabled: true,
        hasAttemptedDeveloperAutoSignIn: true,
        isLoadingAuth: false,
        session: {
          lastResolvedAt: '2026-03-20T00:00:00.000Z',
          source: 'native-learner-session',
          status: 'anonymous',
          user: null,
        },
        supportsLearnerCredentials: true,
      }),
    ).toEqual({
      developerAutoSignInLabel: 'failed',
      isRestoringLearnerSession: false,
      showLearnerCredentialsForm: true,
      statusLabel: 'anonymous',
      userLabel: 'anonymous',
    });
  });

  it('reports authenticated once developer auto sign-in resolves a learner session', () => {
    expect(
      getKangurHomeAuthBoundaryViewModel({
        authError: null,
        developerAutoSignInEnabled: true,
        hasAttemptedDeveloperAutoSignIn: true,
        isLoadingAuth: false,
        session: {
          lastResolvedAt: '2026-03-20T00:00:00.000Z',
          source: 'native-learner-session',
          status: 'authenticated',
          user: {
            actorType: 'learner',
            activeLearner: {
              id: 'learner-1',
              ownerUserId: 'parent-1',
              displayName: 'Ada Learner',
              loginName: 'ada',
              status: 'active',
              legacyUserKey: null,
              createdAt: '2026-03-20T00:00:00.000Z',
              updatedAt: '2026-03-20T00:00:00.000Z',
            },
            full_name: 'Ada Lovelace',
            id: 'user-1',
            email: null,
            learner_id: 'learner-1',
            role: 'user',
            canManageLearners: false,
            ownerUserId: 'parent-1',
            learners: [],
          },
        } as never,
        supportsLearnerCredentials: true,
      }),
    ).toEqual({
      developerAutoSignInLabel: 'authenticated',
      isRestoringLearnerSession: false,
      showLearnerCredentialsForm: false,
      statusLabel: 'authenticated',
      userLabel: 'Ada Lovelace (learner)',
    });
  });
});
