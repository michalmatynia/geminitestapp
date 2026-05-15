import type { Dispatch, SetStateAction } from 'react';
import type { KangurLearnerActivityStatus } from '@kangur/platform';
import { cloneStatus } from './status-utils';

export type KangurLearnerActivityStateControllers = {
  setError: Dispatch<SetStateAction<string | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<KangurLearnerActivityStatus | null>>;
};

export const clearKangurLearnerActivityState = ({
  setError,
  setIsLoading,
  setStatus,
}: KangurLearnerActivityStateControllers): void => {
  setStatus(null);
  setError(null);
  setIsLoading(false);
};

export const applyCachedKangurLearnerActivityState = ({
  cachedStatus,
  setError,
  setIsLoading,
  setStatus,
}: KangurLearnerActivityStateControllers & {
  cachedStatus: KangurLearnerActivityStatus;
}): void => {
  setStatus(cloneStatus(cachedStatus));
  setError(null);
  setIsLoading(false);
};

export const markPendingKangurLearnerActivityState = ({
  setError,
  setIsLoading,
  setStatus,
}: KangurLearnerActivityStateControllers): void => {
  setStatus(null);
  setError(null);
  setIsLoading(true);
};

export const prepareKangurLearnerActivityRefresh = ({
  currentStatus,
  setError,
  setIsLoading,
}: Pick<KangurLearnerActivityStateControllers, 'setError' | 'setIsLoading'> & {
  currentStatus: KangurLearnerActivityStatus | null;
}): void => {
  if (currentStatus === null) {
    setIsLoading(true);
  }
  setError(null);
};
