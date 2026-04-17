import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';

export const toActionSequenceKey = (
  runtimeKey: string | null | undefined
): ActionSequenceKey | null => {
  if (typeof runtimeKey !== 'string' || !(runtimeKey in ACTION_SEQUENCES)) {
    return null;
  }

  return runtimeKey as ActionSequenceKey;
};
