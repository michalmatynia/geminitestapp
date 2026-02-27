'use client';

import { useCallback } from 'react';

import type { ReorderValidationPatternUpdatePayload } from '@/features/products/api/settings';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { applyInternalMasterTreeDrop } from '@/shared/lib/foldertree/v2';
import type { MasterTreeDropPosition, MasterTreeId } from '@/shared/utils/master-folder-tree-contract';
import { useToast } from '@/shared/ui';

import { resolveValidatorPatternReorderUpdates } from './validator-pattern-master-tree';

export type ReorderPatternsMutation = {
  mutateAsync: (payload: { updates: ReorderValidationPatternUpdatePayload[] }) => Promise<unknown>;
  isPending: boolean;
};

/**
 * Provides an `onNodeDrop` handler for the ValidatorPatternTree.
 *
 * On each drag-drop:
 * 1. Captures the previous node state
 * 2. Applies the internal tree move (updates sortOrder, parentId in controller)
 * 3. Computes the minimal diff using resolveValidatorPatternReorderUpdates
 * 4. Sends only the changed records to the API — fixing the O(n) bottleneck
 */
export function useValidatorPatternTreeActions(args: {
  reorderPatterns: ReorderPatternsMutation;
}): {
  onNodeDrop: (
    input: {
      draggedNodeId: MasterTreeId;
      targetId: MasterTreeId | null;
      position: MasterTreeDropPosition;
      rootDropZone?: 'top' | 'bottom' | undefined;
    },
    controller: MasterFolderTreeController
  ) => Promise<void>;
} {
  const { toast } = useToast();
  const { reorderPatterns } = args;

  const onNodeDrop = useCallback(
    async (
      input: {
        draggedNodeId: MasterTreeId;
        targetId: MasterTreeId | null;
        position: MasterTreeDropPosition;
        rootDropZone?: 'top' | 'bottom' | undefined;
      },
      controller: MasterFolderTreeController
    ): Promise<void> => {
      const previousNodes: MasterTreeNode[] = [...controller.nodes];

      await applyInternalMasterTreeDrop({
        controller,
        draggedNodeId: input.draggedNodeId,
        targetId: input.targetId,
        position: input.position,
        rootDropZone: input.rootDropZone,
      });

      const nextNodes: MasterTreeNode[] = controller.nodes;

      const updates = resolveValidatorPatternReorderUpdates({
        previousNodes,
        nextNodes,
      });

      if (updates.length === 0) return;

      try {
        await reorderPatterns.mutateAsync({ updates });
      } catch (error: unknown) {
        logClientError(error, {
          context: {
            source: 'useValidatorPatternTreeActions',
            action: 'reorder',
            draggedNodeId: input.draggedNodeId,
            updateCount: updates.length,
          },
        });
        toast(
          error instanceof Error ? error.message : 'Failed to reorder patterns.',
          { variant: 'error' }
        );
      }
    },
    [reorderPatterns, toast]
  );

  return { onNodeDrop };
}
