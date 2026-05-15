import { type KangurLearnerActivityStatus } from '@kangur/platform';
import { type KangurLearnerActivityStatus as KangurLearnerActivityStatusContract } from '@/features/kangur/shared/contracts/kangur';

export type LearnerActivityStatus = KangurLearnerActivityStatusContract;

export const cloneStatus = (status: LearnerActivityStatus): LearnerActivityStatus => ({
  ...status,
  snapshot: status.snapshot ? { ...status.snapshot } : null,
});

export const isStatusValid = (status: unknown): status is LearnerActivityStatus => {
  return typeof status === 'object' && status !== null && 'learnerId' in status;
};
