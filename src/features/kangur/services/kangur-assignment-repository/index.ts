import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoKangurAssignmentRepository } from './mongo-kangur-assignment-repository';

import type { KangurAssignmentRepository } from './types';

export type { KangurAssignmentListInput, KangurAssignmentRepository } from './types';

const KANGUR_ASSIGNMENT_REPOSITORY_SERVICE = 'kangur.assignment-repository';

export const getKangurAssignmentRepository = async (): Promise<KangurAssignmentRepository> => {
  const provider = 'mongodb';
  const repository = mongoKangurAssignmentRepository;

  return {
    createAssignment: async (input) => {
      try {
        return await repository.createAssignment(input);
      } catch (error) {
        void ErrorSystem.captureException(error);
        void ErrorSystem.captureException(error, {
          service: KANGUR_ASSIGNMENT_REPOSITORY_SERVICE,
          action: 'createAssignment',
          provider,
          learnerKey: input.learnerKey,
          targetType: input.target.type,
        });
        throw error;
      }
    },
    getAssignment: async (learnerKey, assignmentId) => {
      try {
        return await repository.getAssignment(learnerKey, assignmentId);
      } catch (error) {
        void ErrorSystem.captureException(error);
        void ErrorSystem.captureException(error, {
          service: KANGUR_ASSIGNMENT_REPOSITORY_SERVICE,
          action: 'getAssignment',
          provider,
          learnerKey,
          assignmentId,
        });
        throw error;
      }
    },
    listAssignments: async (input) => {
      try {
        return await repository.listAssignments(input);
      } catch (error) {
        void ErrorSystem.captureException(error);
        void ErrorSystem.captureException(error, {
          service: KANGUR_ASSIGNMENT_REPOSITORY_SERVICE,
          action: 'listAssignments',
          provider,
          learnerKey: input.learnerKey,
          includeArchived: input.includeArchived ?? false,
        });
        throw error;
      }
    },
    updateAssignment: async (learnerKey, assignmentId, input) => {
      try {
        return await repository.updateAssignment(learnerKey, assignmentId, input);
      } catch (error) {
        void ErrorSystem.captureException(error);
        void ErrorSystem.captureException(error, {
          service: KANGUR_ASSIGNMENT_REPOSITORY_SERVICE,
          action: 'updateAssignment',
          provider,
          learnerKey,
          assignmentId,
          updateKeys: Object.keys(input),
        });
        throw error;
      }
    },
  };
};
