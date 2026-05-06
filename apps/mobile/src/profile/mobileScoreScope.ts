import type { KangurScoreListQuery } from '@kangur/contracts/kangur';
import type { KangurUser } from '@kangur/platform';

export type KangurMobileScoreScope = {
  identityKey: string;
  query: Pick<KangurScoreListQuery, 'created_by' | 'learner_id'>;
};

export const resolveKangurMobileScoreScope = (
  user: KangurUser | null | undefined,
): KangurMobileScoreScope | null => {
  const learnerId = user?.activeLearner?.id;
  if (typeof learnerId === 'string' && learnerId.trim() !== '') {
    return {
      identityKey: `learner:${learnerId.trim()}`,
      query: { learner_id: learnerId.trim() },
    };
  }

  const email = user?.email;
  if (typeof email === 'string' && email.trim() !== '') {
    return {
      identityKey: `email:${email.trim().toLowerCase()}`,
      query: { created_by: email.trim().toLowerCase() },
    };
  }

  return null;
};
