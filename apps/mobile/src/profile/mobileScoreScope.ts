import type { KangurScoreListQuery } from '@kangur/contracts';
import type { KangurUser } from '@kangur/platform';

export type KangurMobileScoreScope = {
  identityKey: string;
  query: Pick<KangurScoreListQuery, 'created_by' | 'learner_id'>;
};

export const resolveKangurMobileScoreScope = (
  user: KangurUser | null | undefined,
): KangurMobileScoreScope | null => {
  const learnerId = user?.activeLearner?.id?.trim();
  if (learnerId) {
    return {
      identityKey: `learner:${learnerId}`,
      query: {
        learner_id: learnerId,
      },
    };
  }

  const email = user?.email?.trim();
  if (email) {
    return {
      identityKey: `email:${email.toLowerCase()}`,
      query: {
        created_by: email.toLowerCase(),
      },
    };
  }

  return null;
};
