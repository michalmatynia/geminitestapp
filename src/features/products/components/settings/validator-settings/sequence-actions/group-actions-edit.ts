import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { getSequenceGroupId, normalizeSequenceGroupDebounceMs } from '../helpers';

import { normalizeSequenceGroupLabel } from './group-actions.helpers';
import type { UpdatePatternMutation } from './types';

export const handleRenameGroup = async (args: {
  groupId: string;
  label: string;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { groupId, label, patterns, updatePattern, notifyError } = args;
  const groupPatterns = patterns.filter((pattern) => getSequenceGroupId(pattern) === groupId);
  try {
    await Promise.all(
      groupPatterns.map((pattern) =>
        updatePattern.mutateAsync({
          id: pattern.id,
          data: { sequenceGroupLabel: normalizeSequenceGroupLabel(label) },
        })
      )
    );
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'renameGroup',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to rename group.');
  }
};

export const handleUpdateGroupDebounce = async (args: {
  groupId: string;
  debounceMs: number;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { groupId, debounceMs, patterns, updatePattern, notifyError } = args;
  const normalized = normalizeSequenceGroupDebounceMs(debounceMs);
  const groupPatterns = patterns.filter((pattern) => getSequenceGroupId(pattern) === groupId);
  try {
    await Promise.all(
      groupPatterns.map((pattern) =>
        updatePattern.mutateAsync({
          id: pattern.id,
          data: { sequenceGroupDebounceMs: normalized },
        })
      )
    );
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'updateGroupDebounce',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to update group debounce.');
  }
};
