'use client';

import React, { useCallback, useMemo } from 'react';

import {
  createMasterFolderTreeOrderedItemsAdapter,
  MasterFolderTreeViewport,
  type MasterFolderTreeAdapterV3,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { ValidatorPatternList } from '@/shared/contracts/admin';
import { FolderTreePanel } from '@/shared/ui/navigation-and-layout.public';

import {
  buildValidatorListMasterNodes,
  resolveValidatorListOrderFromNodes,
} from './validator-list-master-tree';
import { ValidatorListNodeItem } from './ValidatorListNodeItem';
import { ValidatorListTreeContext, useValidatorListTreeContext } from './ValidatorListTreeContext';

// ─── ValidatorListTree ────────────────────────────────────────────────────────

export interface ValidatorListTreeProps {
  lists: ValidatorPatternList[];
  onReorder: (reorderedLists: ValidatorPatternList[]) => void;
  onEdit: (list: ValidatorPatternList) => void;
  onToggleLock: (listId: string) => void;
  onRemove: (list: ValidatorPatternList) => void;
  isPending: boolean;
}

function useValidatorListTreeAdapter(
  lists: ValidatorPatternList[],
  listById: Map<string, ValidatorPatternList>,
  onReorder: (reorderedLists: ValidatorPatternList[]) => void
): MasterFolderTreeAdapterV3 {
  return useMemo(
    () =>
      createMasterFolderTreeOrderedItemsAdapter({
        items: lists,
        itemById: listById,
        getItemId: (list) => list.id,
        resolveOrderedItemsFromNodes: resolveValidatorListOrderFromNodes,
        onPersistItems: onReorder,
      }),
    [listById, lists, onReorder]
  );
}

function ValidatorListTreeViewport(): React.JSX.Element {
  const {
    tree,
    isPending: treePending,
    renderNode,
  } = useValidatorListTreeContext();

  return (
    <MasterFolderTreeViewport
      tree={tree}
      renderNode={renderNode}
      enableDnd={!treePending}
      emptyLabel='No validation pattern lists'
    />
  );
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
  const adapter = useValidatorListTreeAdapter(lists, listById, onReorder);

  const tree = useMasterFolderTreeViewModel({
    instance: 'validator_list_tree',
    nodes: masterNodes,
    adapter,
  });
  const { controller } = tree;

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <ValidatorListNodeItem {...input} />
    ),
    []
  );

  const contextValue = useMemo(
    () => ({
      controller,
      tree,
      renderNode,
      listById,
      onEdit,
      onToggleLock,
      onRemove,
      isPending,
    }),
    [
      controller,
      tree,
      renderNode,
      listById,
      onEdit,
      onToggleLock,
      onRemove,
      isPending,
    ]
  );

  return (
    <ValidatorListTreeContext.Provider value={contextValue}>
      <FolderTreePanel masterInstance='validator_list_tree'>
        <ValidatorListTreeViewport />
      </FolderTreePanel>
    </ValidatorListTreeContext.Provider>
  );
}
