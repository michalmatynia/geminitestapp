'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
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

function useSyncedRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

function useValidatorListTreeAdapter(
  listById: Map<string, ValidatorPatternList>,
  onReorder: (reorderedLists: ValidatorPatternList[]) => void
): ReturnType<typeof createMasterFolderTreeTransactionAdapter> {
  const listByIdRef = useSyncedRef(listById);
  const onReorderRef = useSyncedRef(onReorder);

  return useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: (tx) => {
          const reordered = resolveValidatorListOrderFromNodes(tx.nextNodes, listByIdRef.current);
          onReorderRef.current(reordered);
        },
      }),
    [listByIdRef, onReorderRef]
  );
}

function ValidatorListTreeViewport(): React.JSX.Element {
  const {
    controller: treeController,
    isPending: treePending,
    scrollToNodeRef,
    rootDropUi,
    renderNode,
  } = useValidatorListTreeContext();

  return (
    <FolderTreeViewportV2
      controller={treeController}
      scrollToNodeRef={scrollToNodeRef}
      rootDropUi={rootDropUi}
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
  const adapter = useValidatorListTreeAdapter(listById, onReorder);

  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'validator_list_tree',
    nodes: masterNodes,
    adapter,
  });

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <ValidatorListNodeItem {...input} />
    ),
    []
  );

  const contextValue = useMemo(
    () => ({
      controller,
      scrollToNodeRef,
      rootDropUi,
      renderNode,
      listById,
      onEdit,
      onToggleLock,
      onRemove,
      isPending,
    }),
    [
      controller,
      scrollToNodeRef,
      rootDropUi,
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
