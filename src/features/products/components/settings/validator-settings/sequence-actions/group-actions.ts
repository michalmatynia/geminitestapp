import type { ProductValidationPattern, SequenceGroupDraft } from '@/shared/contracts/products';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  createSequenceGroupId,
  getPatternSequence,
  getSequenceGroupId,
  normalizeSequenceGroupDebounceMs,
  sortRuleDraftsBySequence,
  DEFAULT_SEQUENCE_STEP,
} from '../helpers';

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
  const normalizedLabel = draft.label.trim() || 'Sequence / Group';
  const normalizedDebounce = normalizeSequenceGroupDebounceMs(
    Number.parseInt(draft.debounceMs, 10) || 0
  );

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
    logClientError(error);
    logClientError(error, {
      context: { source: 'useValidatorSettingsController', action: 'saveSequenceGroup' },
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
    notifySuccess('Group members ungrouped.');
  } catch (error) {
    logClientError(error);
    logClientError(error, {
      context: { source: 'useValidatorSettingsController', action: 'ungroup' },
    });
    notifyError(error instanceof Error ? error.message : 'Failed to ungroup patterns.');
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
    await Promise.all(
      result.map((pattern, index) => {
        const nextSequence = (index + 1) * DEFAULT_SEQUENCE_STEP;
        if (getPatternSequence(pattern, index) === nextSequence) return Promise.resolve();
        return updatePattern.mutateAsync({
          id: pattern.id,
          data: { sequence: nextSequence },
        });
      })
    );
  } catch (error) {
    logClientError(error);
    logClientError(error, {
      context: { source: 'useValidatorSettingsController', action: 'moveGroup' },
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
  const pattern = patterns.find((p) => p.id === patternId);
  if (!pattern) return;
  const groupId = getSequenceGroupId(pattern);
  if (!groupId) return;

  const ordered = sortRuleDraftsBySequence(patterns);
  const groupMembers = ordered.filter((p) => getSequenceGroupId(p) === groupId);

  const movedIndex = groupMembers.findIndex((p) => p.id === patternId);
  if (movedIndex < 0) return;

  const nextGroupMembers = [...groupMembers];
  const [moved] = nextGroupMembers.splice(movedIndex, 1);
  if (moved) {
    nextGroupMembers.splice(Math.max(0, Math.min(targetIndex, nextGroupMembers.length)), 0, moved);
  }

  const result = [...ordered];
  let groupWritePtr = 0;
  for (let i = 0; i < result.length; i += 1) {
    if (getSequenceGroupId(result[i]!) === groupId) {
      result[i] = nextGroupMembers[groupWritePtr++]!;
    }
  }

  try {
    await Promise.all(
      result.map((p, index) => {
        const nextSequence = (index + 1) * DEFAULT_SEQUENCE_STEP;
        if (getPatternSequence(p, index) === nextSequence) return Promise.resolve();
        return updatePattern.mutateAsync({
          id: p.id,
          data: { sequence: nextSequence },
        });
      })
    );
  } catch (error) {
    logClientError(error);
    logClientError(error, {
      context: { source: 'useValidatorSettingsController', action: 'reorderInGroup' },
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
  if (!targetGroupMember) return;

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
    logClientError(error);
    logClientError(error, {
      context: { source: 'useValidatorSettingsController', action: 'moveToGroup' },
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
  if (!pattern) return;
  const groupId = getSequenceGroupId(pattern);
  if (!groupId) return;

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
      const lone = remainingInGroup[0]!;
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

    await Promise.all(updates);
  } catch (error) {
    logClientError(error);
    logClientError(error, {
      context: { source: 'useValidatorSettingsController', action: 'removeFromGroup' },
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
    logClientError(error);
    logClientError(error, {
      context: { source: 'useValidatorSettingsController', action: 'createGroup' },
    });
    notifyError(error instanceof Error ? error.message : 'Failed to create group.');
  }
};

export const handleRenameGroup = async (args: {
  groupId: string;
  label: string;
  patterns: ProductValidationPattern[];
  updatePattern: UpdatePatternMutation;
  notifyError: (message: string) => void;
}): Promise<void> => {
  const { groupId, label, patterns, updatePattern, notifyError } = args;
  const groupPatterns = patterns.filter((p) => getSequenceGroupId(p) === groupId);
  try {
    await Promise.all(
      groupPatterns.map((p) =>
        updatePattern.mutateAsync({
          id: p.id,
          data: { sequenceGroupLabel: label.trim() || 'Sequence / Group' },
        })
      )
    );
  } catch (error) {
    logClientError(error);
    logClientError(error, {
      context: { source: 'useValidatorSettingsController', action: 'renameGroup' },
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
  const groupPatterns = patterns.filter((p) => getSequenceGroupId(p) === groupId);
  try {
    await Promise.all(
      groupPatterns.map((p) =>
        updatePattern.mutateAsync({
          id: p.id,
          data: { sequenceGroupDebounceMs: normalized },
        })
      )
    );
  } catch (error) {
    logClientError(error);
    logClientError(error, {
      context: { source: 'useValidatorSettingsController', action: 'updateGroupDebounce' },
    });
    notifyError(error instanceof Error ? error.message : 'Failed to update group debounce.');
  }
};
