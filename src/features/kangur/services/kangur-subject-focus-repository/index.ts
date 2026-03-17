import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurSubjectFocusRepository } from './mongo-kangur-subject-focus-repository';
import type { KangurSubjectFocusRepository } from './types';

export type { KangurSubjectFocusRepository } from './types';

const KANGUR_SUBJECT_FOCUS_REPOSITORY_SERVICE = 'kangur.subject-focus-repository';

export const getKangurSubjectFocusRepository = async (): Promise<KangurSubjectFocusRepository> => {
  const provider = 'mongodb';
  const repository = mongoKangurSubjectFocusRepository;

  return {
    getSubjectFocus: async (learnerId) => {
      try {
        return await repository.getSubjectFocus(learnerId);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: KANGUR_SUBJECT_FOCUS_REPOSITORY_SERVICE,
          action: 'getSubjectFocus',
          provider,
          learnerId,
        });
        throw error;
      }
    },
    saveSubjectFocus: async (learnerId, subject) => {
      try {
        return await repository.saveSubjectFocus(learnerId, subject);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: KANGUR_SUBJECT_FOCUS_REPOSITORY_SERVICE,
          action: 'saveSubjectFocus',
          provider,
          learnerId,
          subject,
        });
        throw error;
      }
    },
  };
};
