/**
 * Runtime Action Keys
 * 
 * Utilities for runtime action key validation and conversion.
 * Provides:
 * - Action sequence key type conversion
 * - Runtime key validation
 * - Type-safe key mapping
 * - Action sequence registry integration
 */

import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';

/**
 * Converts a runtime key string to an ActionSequenceKey if valid
 * @param runtimeKey - Runtime key string to convert
 * @returns ActionSequenceKey if valid, null otherwise
 */
export const toActionSequenceKey = (
  runtimeKey: string | null | undefined
): ActionSequenceKey | null => {
  if (typeof runtimeKey !== 'string' || !(runtimeKey in ACTION_SEQUENCES)) {
    return null;
  }

  return runtimeKey as ActionSequenceKey;
};
