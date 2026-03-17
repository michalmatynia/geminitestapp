import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurLearnerActivityRepository } from './mongo-kangur-learner-activity-repository';
import type { KangurLearnerActivityRepository } from './types';

export type { KangurLearnerActivityRepository } from './types';

const KANGUR_LEARNER_ACTIVITY_REPOSITORY_SERVICE = 'kangur.learner-activity-repository';

export const getKangurLearnerActivityRepository =
  async (): Promise<KangurLearnerActivityRepository> => {
    const provider = 'mongodb';
    const repository = mongoKangurLearnerActivityRepository;

    return {
      getActivity: async (learnerId) => {
        try {
          return await repository.getActivity(learnerId);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LEARNER_ACTIVITY_REPOSITORY_SERVICE,
            action: 'getActivity',
            provider,
            learnerId,
          });
          throw error;
        }
      },
      saveActivity: async (learnerId, input) => {
        try {
          return await repository.saveActivity(learnerId, input);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: KANGUR_LEARNER_ACTIVITY_REPOSITORY_SERVICE,
            action: 'saveActivity',
            provider,
            learnerId,
            kind: input.kind,
          });
          throw error;
        }
      },
    };
  };
