'use client';

import React, { useCallback, useEffect, useMemo } from 'react';

import {
  applyInternalMasterTreeDrop,
  FolderTreeViewportV2,
  MasterFolderTreeRuntimeProvider,
  useFolderTreeInstanceV2,
} from '@/shared/lib/foldertree/v2';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/v2';
import type { ValidatorPatternList } from '@/shared/contracts/admin';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
} from '@/shared/utils/master-folder-tree-contract';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { useToast } from '@/shared/ui';

import {
  buildValidatorListMasterNodes,
  resolveValidatorListOrderFromNodes,
} from './validator-list-master-tree';
import { ValidatorListTreeContext } from './ValidatorListTreeContext';
import { ValidatorListNodeItem } from './ValidatorListNodeItem';

// ─── Tree Profile ─────────────────────────────────────────────────────────────

const VALIDATOR_LIST_TREE_PROFILE: FolderTreeProfileV2 = {
  version: 2,
  placeholders: {
    preset: 'classic',
    style: 'line',
    emphasis: 'subtle',
    rootDropLabel: 'Move here',
    inlineDropLabel: '',
  },
  icons: {
    slots: {
      folderClosed: null,
      folderOpen: null,
      file: null,
      root: null,
      dragHandle: null,
    },
    byKind: {},
  },
  nesting: {
    defaultAllow: false,
    blockedTargetKinds: [],
    rules: [
      // Lists can only be at root (flat list, no nesting)
      {
        childType: 'file',
        childKinds: ['validator-list'],
        targetType: 'root',
        targetKinds: ['*'],
        allow: true,
      },
    ],
  },
  interactions: {
    selectionBehavior: 'click_away',
  },
};

// ─── ValidatorListTree ────────────────────────────────────────────────────────

export interface ValidatorListTreeProps {
  lists: ValidatorPatternList[];
  onReorder: (reorderedLists: ValidatorPatternList[]) => void;
  onEdit: (list: ValidatorPatternList) => void;
  onToggleLock: (listId: string) => void;
  onRemove: (list: ValidatorPatternList) => void;
  isPending: boolean;
}

export function ValidatorListTree({
  lists,
  onReorder,
  onEdit,
  onToggleLock,
  onRemove,
  isPending,
}: ValidatorListTreeProps): React.JSX.Element {
  const { toast } = useToast();

  const masterNodes = useMemo(() => buildValidatorListMasterNodes(lists), [lists]);

  const controller = useFolderTreeInstanceV2({
    instanceId: 'validator_list_tree',
    profile: VALIDATOR_LIST_TREE_PROFILE,
    initialNodes: masterNodes,
  });

  // Sync when parent `lists` state changes (e.g. after add or external reset)
  useEffect(() => {
    void controller.replaceNodes(masterNodes, 'external_sync');
    // controller is a stable object; masterNodes changes drive the sync
  }, [masterNodes]);

  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const onNodeDrop = useCallback(
    async (
      input: {
        draggedNodeId: MasterTreeId;
        targetId: MasterTreeId | null;
        position: MasterTreeDropPosition;
        rootDropZone?: 'top' | 'bottom' | undefined;
      },
      ctrlr: MasterFolderTreeController
    ): Promise<void> => {
      // Apply the internal tree move first (the viewport does not do this when
      // a custom onNodeDrop is provided)
      await applyInternalMasterTreeDrop({
        controller: ctrlr,
        draggedNodeId: input.draggedNodeId,
        targetId: input.targetId,
        position: input.position,
        rootDropZone: input.rootDropZone,
      });

      try {
        const reordered = resolveValidatorListOrderFromNodes(ctrlr.nodes, listById);
        onReorder(reordered);
      } catch (error: unknown) {
        logClientError(error, {
          context: { source: 'ValidatorListTree', action: 'reorder' },
        });
        toast(error instanceof Error ? error.message : 'Failed to reorder lists.', {
          variant: 'error',
        });
      }
    },
    [listById, onReorder, toast]
  );

  const contextValue = useMemo(
    () => ({
      controller,
      listById,
      onEdit,
      onToggleLock,
      onRemove,
      isPending,
    }),
    [controller, listById, onEdit, onToggleLock, onRemove, isPending]
  );

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <ValidatorListNodeItem
        node={input.node}
        depth={input.depth}
        hasChildren={input.hasChildren}
        isExpanded={input.isExpanded}
        isSelected={input.isSelected}
        isRenaming={input.isRenaming}
        isDragging={input.isDragging}
        isDropTarget={input.isDropTarget}
        dropPosition={input.dropPosition}
        select={input.select}
        toggleExpand={input.toggleExpand}
      />
    ),
    []
  );

  return (
    <MasterFolderTreeRuntimeProvider>
      <ValidatorListTreeContext.Provider value={contextValue}>
        <FolderTreeViewportV2
          controller={controller}
          renderNode={renderNode}
          onNodeDrop={onNodeDrop}
          enableDnd={!isPending}
          emptyLabel='No validation pattern lists'
        />
      </ValidatorListTreeContext.Provider>
    </MasterFolderTreeRuntimeProvider>
  );
}
