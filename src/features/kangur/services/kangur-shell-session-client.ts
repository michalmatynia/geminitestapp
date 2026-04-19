import type { KangurAuthPort, KangurUser } from '@kangur/platform';
import { resetGuestKangurScoreSession } from '@/features/kangur/services/guest-kangur-scores';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import { saveProgressOwnerKey } from '@/features/kangur/ui/services/progress';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import {
  clearSessionUserCache,
  prepareLoginHref,
  requestKangurLogout,
  resolveSessionUser,
} from './local-kangur-platform-auth';
import { clearScoreQueryCache } from './local-kangur-platform-score-cache';

type KangurShellSessionClient = {
  auth: KangurAuthPort;
  learners: {
    select: (learnerId: string) => Promise<KangurUser>;
  };
};

const clearKangurShellSessionState = (): void => {
  clearSessionUserCache();
  clearScoreQueryCache();
  clearStoredActiveLearnerId();
  saveProgressOwnerKey(null);
  resetGuestKangurScoreSession();
};

const logoutKangurShellSession = async (returnUrl?: string): Promise<void> => {
  clearKangurShellSessionState();

  await requestKangurLogout({
    headers: withCsrfHeaders(),
  }).catch((error) => {
    void ErrorSystem.captureException(error);
  });

  if (returnUrl) {
    window.location.assign(returnUrl);
  }
};

const selectKangurShellLearner = async (learnerId: string): Promise<KangurUser> => {
  setStoredActiveLearnerId(learnerId);
  clearScoreQueryCache();
  clearSessionUserCache();
  return await resolveSessionUser();
};

export const kangurShellSessionClient: KangurShellSessionClient = {
  auth: {
    me: resolveSessionUser,
    prepareLoginHref,
    redirectToLogin: (returnUrl: string) => {
      window.location.assign(prepareLoginHref(returnUrl));
    },
    logout: logoutKangurShellSession,
  },
  learners: {
    select: selectKangurShellLearner,
  },
};
