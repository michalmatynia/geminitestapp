import { useMemo } from 'react';
import { type KangurAuthSession } from '@kangur/platform';
import { type SummaryIdentity } from './duels-summary-types';

export function useSummaryIdentity(authSession: KangurAuthSession): SummaryIdentity {
  return useMemo(() => {
    const user = authSession.user;
    const learnerIdentity = user 
      ? (user.activeLearner?.id ?? user.email ?? user.id) 
      : 'guest';
    const activeLearnerId = user ? (user.activeLearner?.id ?? user.id) : null;
    return { learnerIdentity, activeLearnerId };
  }, [authSession.user]);
}
