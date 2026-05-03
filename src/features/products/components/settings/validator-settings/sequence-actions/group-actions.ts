import type { ProductValidationPattern, SequenceGroupDraft } from '@/shared/contracts/products/validation';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  createSequenceGroupId,
  getSequenceGroupId,
  sortRuleDraftsBySequence,
} from '../helpers';

import {
  buildReorderedGroupResult,
  normalizeSequenceGroupDraftDebounceMs,
  normalizeSequenceGroupLabel,
  persistPatternSequences,
} from './group-actions.helpers';
export { handleRenameGroup, handleUpdateGroupDebounce } from './group-actions-edit';
import type { UpdatePatternMutation } from './types';

export const handleSaveSequenceGroup = async (args: {
  groupId: string;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { groupId, getGroupDraft, patterns, updatePattern, notifySuccess, notifyError } = args;
  const draft = getGroupDraft(groupId);
  const normalizedLabel = normalizeSequenceGroupLabel(draft.label);
  const normalizedDebounce = normalizeSequenceGroupDraftDebounceMs(draft.debounceMs);

  const groupPatterns = patterns.filter((p) => getSequenceGroupId(p) === groupId);
  if (groupPatterns.length === 0) {
    notifyError('No patterns found in this group.');
    return;
  }

  try {
    await Promise.all(
      groupPatterns.map((pattern) =>
        updatePattern.mutateAsync({
          id: pattern.id,
          data: {
            sequenceGroupLabel: normalizedLabel,
            sequenceGroupDebounceMs: normalizedDebounce,
          },
        })
      )
    );
    notifySuccess(`Group "${normalizedLabel}" saved.`);
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'saveSequenceGroup',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to save sequence group.');
  }
};

export const handleUngroup = async (args: {
  groupId: string;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { groupId, patterns, updatePattern, notifySuccess, notifyError } = args;
  const groupPatterns = patterns.filter((p) => getSequenceGroupId(p) === groupId);
  if (groupPatterns.length === 0) {
    notifyError('No patterns found in this sequence.');
    return;
  }

  try {
    await Promise.all(
      groupPatterns.map((pattern) =>
        updatePattern.mutateAsync({
          id: pattern.id,
          data: {
            sequenceGroupId: null,
            sequenceGroupLabel: null,
            sequenceGroupDebounceMs: 0,
          },
        })
      )
    );
    notifySuccess('Sequence deleted. Patterns were kept as standalone rules.');
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'ungroup',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to delete sequence.');
  }
};

export const handleMoveGroup = async (args: {
  groupId: string;
  targetIndex: number;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { groupId, targetIndex, patterns, updatePattern, notifyError } = args;
  const ordered = sortRuleDraftsBySequence(patterns);
  const groupPatternIds = new Set(
    patterns.filter((p) => getSequenceGroupId(p) === groupId).map((p) => p.id)
  );

  const others = ordered.filter((p) => !groupPatternIds.has(p.id));
  const groupMembers = ordered.filter((p) => groupPatternIds.has(p.id));

  const result = [...others];
  result.splice(Math.max(0, Math.min(targetIndex, others.length)), 0, ...groupMembers);

  try {
    await persistPatternSequences(result, updatePattern);
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'moveGroup',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to move group.');
  }
};

export const handleReorderInGroup = async (args: {
  patternId: string;
  targetIndex: number;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { patternId, targetIndex, patterns, updatePattern, notifyError } = args;
  const result = buildReorderedGroupResult(patterns, patternId, targetIndex);
  if (result === null) return;

  try {
    await persistPatternSequences(result, updatePattern);
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'reorderInGroup',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to reorder patterns in group.');
  }
};

export const handleMoveToGroup = async (args: {
  patternId: string;
  groupId: string;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { patternId, groupId, patterns, updatePattern, notifyError } = args;
  const targetGroupMember = patterns.find((p) => getSequenceGroupId(p) === groupId);
  if (targetGroupMember === undefined) return;

  try {
    await updatePattern.mutateAsync({
      id: patternId,
      data: {
        sequenceGroupId: groupId,
        sequenceGroupLabel: targetGroupMember.sequenceGroupLabel,
        sequenceGroupDebounceMs: targetGroupMember.sequenceGroupDebounceMs,
      },
    });
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'moveToGroup',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to move pattern to group.');
  }
};

export const handleRemoveFromGroup = async (args: {
  patternId: string;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { patternId, patterns, updatePattern, notifyError } = args;
  const pattern = patterns.find((p) => p.id === patternId);
  if (pattern === undefined) return;
  const groupId = getSequenceGroupId(pattern);
  if (groupId === null) return;

  try {
    const remainingInGroup = patterns.filter(
      (p) => getSequenceGroupId(p) === groupId && p.id !== patternId
    );

    const updates: Promise<unknown>[] = [
      updatePattern.mutateAsync({
        id: patternId,
        data: {
          sequenceGroupId: null,
          sequenceGroupLabel: null,
          sequenceGroupDebounceMs: 0,
        },
      }),
    ];

    if (remainingInGroup.length === 1) {
      const lone = remainingInGroup[0];
      if (lone !== undefined) {
        updates.push(
          updatePattern.mutateAsync({
            id: lone.id,
            data: {
              sequenceGroupId: null,
              sequenceGroupLabel: null,
              sequenceGroupDebounceMs: 0,
            },
          })
        );
      }
    }

    await Promise.all(updates);
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'removeFromGroup',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to remove pattern from group.');
  }
};

export const handleCreateGroup = async (args: {
  patternIds: string[];
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { patternIds, updatePattern, notifyError } = args;
  if (patternIds.length < 2) return;
  const newGroupId = createSequenceGroupId();
  const label = 'New Sequence / Group';

  try {
    await Promise.all(
      patternIds.map((id) =>
        updatePattern.mutateAsync({
          id,
          data: {
            sequenceGroupId: newGroupId,
            sequenceGroupLabel: label,
            sequenceGroupDebounceMs: 300,
          },
        })
      )
    );
  } catch (error) {
    logClientCatch(error, {
      source: 'useValidatorSettingsController',
      action: 'createGroup',
    });
    notifyError(error instanceof Error ? error.message : 'Failed to create group.');
  }
};
