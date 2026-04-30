import { useCallback } from 'react';

import type { SequenceGroupView } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationPattern,
  ReorderProductValidationPatternUpdate as ReorderValidationPatternUpdatePayload,
} from '@/shared/contracts/products/validation';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import type {
  ValidatorReorderActions,
  ValidatorSettingsMutations,
  ValidatorToast,
} from './useValidatorSettingsController.types';

type DropTargetGroup = {
  id: string;
  label: string;
  debounceMs: number;
};

type ReorderActionArgs = {
  patterns: ProductValidationPattern[];
  reorderPatterns: ValidatorSettingsMutations['reorderPatterns'];
  toast: ValidatorToast;
};

type DropActionArgs = ReorderActionArgs & {
  orderedPatterns: ProductValidationPattern[];
  sequenceGroups: Map<string, SequenceGroupView>;
  sequenceScopedPatternIds: Set<string>;
  handleReorder: (patternId: string, targetIndex: number) => Promise<void>;
};

const getDragDataTransfer = (event: unknown): DataTransfer | null => {
  const dragEvent = event as DragEvent;
  return dragEvent.dataTransfer ?? null;
};

const readDraggedPatternId = (dataTransfer: DataTransfer): string | null => {
  const plainTextId = dataTransfer.getData('text/plain');
  if (plainTextId.length > 0) return plainTextId;

  const patternId = dataTransfer.getData('patternId');
  return patternId.length > 0 ? patternId : null;
};

const resolvePatternSequenceGroupId = (
  pattern: ProductValidationPattern,
  sequenceScopedPatternIds: Set<string>
): string | null => {
  if (!sequenceScopedPatternIds.has(pattern.id)) return null;

  const groupId = pattern.sequenceGroupId?.trim();
  return groupId !== undefined && groupId.length > 0 ? groupId : null;
};

const resolveDropTargetLabel = (
  pattern: ProductValidationPattern,
  targetGroup: SequenceGroupView | undefined
): string => targetGroup?.label ?? pattern.sequenceGroupLabel ?? 'Sequence / Group';

const buildReorderedPatternUpdates = (
  patterns: ProductValidationPattern[],
  patternId: string,
  targetIndex: number
): ReorderValidationPatternUpdatePayload[] | null => {
  const nextPatterns = [...patterns];
  const currentIndex = nextPatterns.findIndex((pattern) => pattern.id === patternId);
  if (currentIndex === -1) return null;

  const moved = nextPatterns[currentIndex];
  if (moved === undefined) return null;
  nextPatterns.splice(currentIndex, 1);
  nextPatterns.splice(targetIndex, 0, moved);

  return nextPatterns.map((pattern, index) => ({
    id: pattern.id,
    sequence: (index + 1) * 10,
  }));
};

const resolveDropTargetGroup = ({
  pattern,
  sequenceGroups,
  sequenceScopedPatternIds,
}: {
  pattern: ProductValidationPattern;
  sequenceGroups: Map<string, SequenceGroupView>;
  sequenceScopedPatternIds: Set<string>;
}): DropTargetGroup | null => {
  const groupId = resolvePatternSequenceGroupId(pattern, sequenceScopedPatternIds);
  if (groupId === null) return null;

  const targetGroup = sequenceGroups.get(groupId);
  return {
    id: groupId,
    label: resolveDropTargetLabel(pattern, targetGroup),
    debounceMs: targetGroup?.debounceMs ?? pattern.sequenceGroupDebounceMs,
  };
};

const buildSequenceAttachUpdates = ({
  patterns,
  draggedId,
  targetIndex,
  targetGroup,
}: {
  patterns: ProductValidationPattern[];
  draggedId: string;
  targetIndex: number;
  targetGroup: DropTargetGroup;
}): ReorderValidationPatternUpdatePayload[] | null => {
  const updates = buildReorderedPatternUpdates(patterns, draggedId, targetIndex);
  if (updates === null) return null;

  return updates.map((update) => {
    if (update.id !== draggedId) return update;
    return {
      ...update,
      sequenceGroupId: targetGroup.id,
      sequenceGroupLabel: targetGroup.label,
      sequenceGroupDebounceMs: targetGroup.debounceMs,
    };
  });
};

const usePatternReorderAction = ({
  patterns,
  reorderPatterns,
  toast,
}: ReorderActionArgs): ((patternId: string, targetIndex: number) => Promise<void>) =>
  useCallback(
    async (patternId: string, targetIndex: number): Promise<void> => {
      const updates = buildReorderedPatternUpdates(patterns, patternId, targetIndex);
      if (updates === null) return;

      try {
        await reorderPatterns.mutateAsync({ updates });
      } catch (error) {
        logClientCatch(error, {
          source: 'useValidatorSettingsController',
          action: 'reorder',
          patternId,
        });
        toast(error instanceof Error ? error.message : 'Failed to reorder patterns.', {
          variant: 'error',
        });
      }
    },
    [patterns, reorderPatterns, toast]
  );

const usePatternDropAction = ({
  patterns,
  orderedPatterns,
  sequenceGroups,
  sequenceScopedPatternIds,
  reorderPatterns,
  handleReorder,
  toast,
}: DropActionArgs): ((pattern: ProductValidationPattern, e: unknown) => void) =>
  useCallback(
    (pattern: ProductValidationPattern, e: unknown): void => {
      const dataTransfer = getDragDataTransfer(e);
      if (dataTransfer === null) return;

      const draggedId = readDraggedPatternId(dataTransfer);
      if (draggedId === null || draggedId === pattern.id) return;

      const targetIndex = orderedPatterns.findIndex((p) => p.id === pattern.id);
      if (targetIndex === -1) return;

      const targetGroup = resolveDropTargetGroup({
        pattern,
        sequenceGroups,
        sequenceScopedPatternIds,
      });
      if (targetGroup === null) {
        void handleReorder(draggedId, targetIndex);
        return;
      }

      const updates = buildSequenceAttachUpdates({ patterns, draggedId, targetIndex, targetGroup });
      if (updates === null) return;

      void reorderPatterns
        .mutateAsync({ updates })
        .then(() => {
          toast('Pattern attached to sequence.', { variant: 'success' });
        })
        .catch((error: unknown) => {
          logClientError(error, {
            context: {
              source: 'useValidatorSettingsController',
              action: 'dropToSequence',
              draggedId,
              targetId: pattern.id,
              targetGroupId: targetGroup.id,
            },
          });
          toast(error instanceof Error ? error.message : 'Failed to attach pattern to sequence.', {
            variant: 'error',
          });
        });
    },
    [
      handleReorder,
      orderedPatterns,
      patterns,
      reorderPatterns,
      sequenceGroups,
      sequenceScopedPatternIds,
      toast,
    ]
  );

export function useValidatorReorderActions(args: DropActionArgs): ValidatorReorderActions {
  const handleDrop = usePatternDropAction(args);

  const handleDragStart = useCallback((event: unknown, patternId: string): void => {
    const dataTransfer = getDragDataTransfer(event);
    dataTransfer?.setData('patternId', patternId);
  }, []);

  const handleReorderInGroup = useCallback(
    async (_groupId: string, patternId: string, targetIndex: number): Promise<void> => {
      await args.handleReorder(patternId, targetIndex);
    },
    [args]
  );

  return {
    handleDragStart,
    handleDrop,
    handlePatternDrop: handleDrop,
    handleReorderInGroup,
  };
}

export function useValidatorBaseReorderAction(
  args: ReorderActionArgs
): (patternId: string, targetIndex: number) => Promise<void> {
  return usePatternReorderAction(args);
}
