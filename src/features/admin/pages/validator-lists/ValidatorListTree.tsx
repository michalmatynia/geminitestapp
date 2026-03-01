'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { useMasterFolderTreeInstance } from '@/features/foldertree';
import {
  FolderTreeViewportV2,
  MasterFolderTreeRuntimeProvider,
} from '@/features/foldertree/v2';
import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import type { ValidatorPatternList } from '@/shared/contracts/admin';
import type {
  MasterFolderTreeAdapterV3,
  MasterFolderTreeTransaction,
} from '@/shared/contracts/master-folder-tree';
import { FolderTreePanel } from '@/shared/ui';

import {
  buildValidatorListMasterNodes,
  resolveValidatorListOrderFromNodes,
} from './validator-list-master-tree';
import { ValidatorListTreeContext } from './ValidatorListTreeContext';
import { ValidatorListNodeItem } from './ValidatorListNodeItem';

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
  const masterNodes = useMemo(() => buildValidatorListMasterNodes(lists), [lists]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const listByIdRef = useRef(listById);
  useEffect(() => {
    listByIdRef.current = listById;
  }, [listById]);

  const onReorderRef = useRef(onReorder);
  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  const adapter = useMemo<MasterFolderTreeAdapterV3>(
    () => ({
      apply: async (tx: MasterFolderTreeTransaction) => {
        const reordered = resolveValidatorListOrderFromNodes(tx.nextNodes, listByIdRef.current);
        onReorderRef.current(reordered);
        return {
          tx,
          appliedAt: Date.now(),
        };
      },
    }),
    []
  );

  const {
    appearance: { rootDropUi },
    controller,
    scrollToNodeRef,
  } = useMasterFolderTreeInstance({
    instance: 'validator_list_tree',
    nodes: masterNodes,
    adapter,
  });

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
        <FolderTreePanel masterInstance='validator_list_tree'>
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            rootDropUi={rootDropUi}
            renderNode={renderNode}
            enableDnd={!isPending}
            emptyLabel='No validation pattern lists'
          />
        </FolderTreePanel>
      </ValidatorListTreeContext.Provider>
    </MasterFolderTreeRuntimeProvider>
  );
}
