import type { KangurAuthSession } from '@kangur/platform';

import { resolveKangurMobileScoreScope } from '../profile/mobileScoreScope';

const resolveAuthQueryIdentity = (
  session: KangurAuthSession,
): {
  scoreScopeIdentityKey: string | null;
  status: KangurAuthSession['status'];
} => ({
  scoreScopeIdentityKey:
    resolveKangurMobileScoreScope(session.user)?.identityKey ?? null,
  status: session.status,
});

export const hasKangurMobileAuthQueryIdentityChanged = (
  previousSession: KangurAuthSession,
  nextSession: KangurAuthSession,
): boolean => {
  const previousIdentity = resolveAuthQueryIdentity(previousSession);
  const nextIdentity = resolveAuthQueryIdentity(nextSession);

  return (
    previousIdentity.status !== nextIdentity.status ||
    previousIdentity.scoreScopeIdentityKey !== nextIdentity.scoreScopeIdentityKey
  );
};
