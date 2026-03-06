'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
  type FolderTreeViewportV2Props,
} from '@/features/foldertree/v2';

import type { AiBrainCatalogEntry } from '../settings';
import { BrainCatalogNodeItem, BrainCatalogNodeItemRuntimeContext } from './BrainCatalogNodeItem';
import {
  buildBrainCatalogMasterNodes,
  createBrainCatalogNodeEntryMap,
  resolveBrainCatalogOrderFromNodes,
} from './brain-catalog-master-tree';

export interface BrainCatalogTreeProps {
  entries: AiBrainCatalogEntry[];
  onChange: (entries: AiBrainCatalogEntry[]) => void;
  onEdit: (entry: AiBrainCatalogEntry) => void;
  onRemove: (entry: AiBrainCatalogEntry) => void;
  isPending?: boolean;
}

type BrainCatalogTreeViewportRuntimeValue = Pick<
  FolderTreeViewportV2Props,
  'controller' | 'scrollToNodeRef' | 'rootDropUi' | 'renderNode'
> & {
  isPending: boolean;
};

const BrainCatalogTreeViewportRuntimeContext =
  React.createContext<BrainCatalogTreeViewportRuntimeValue | null>(null);

function useBrainCatalogTreeViewportRuntime(): BrainCatalogTreeViewportRuntimeValue {
  const runtime = React.useContext(BrainCatalogTreeViewportRuntimeContext);
  if (!runtime) {
    throw new Error(
      'useBrainCatalogTreeViewportRuntime must be used within BrainCatalogTreeViewportRuntimeContext.Provider'
    );
  }
  return runtime;
}

function BrainCatalogTreeViewport(): React.JSX.Element {
  const { controller, scrollToNodeRef, rootDropUi, renderNode, isPending } =
    useBrainCatalogTreeViewportRuntime();
  return (
    <FolderTreeViewportV2
      controller={controller}
      scrollToNodeRef={scrollToNodeRef}
      rootDropUi={rootDropUi}
      renderNode={renderNode}
      enableDnd={!isPending}
      emptyLabel='No catalog entries'
    />
  );
}

export function BrainCatalogTree({
  entries,
  onChange,
  onEdit,
  onRemove,
  isPending = false,
}: BrainCatalogTreeProps): React.JSX.Element {
  const masterNodes = useMemo(() => buildBrainCatalogMasterNodes(entries), [entries]);
  const entryByNodeId = useMemo(() => createBrainCatalogNodeEntryMap(entries), [entries]);

  const entryByNodeIdRef = useRef(entryByNodeId);
  useEffect(() => {
    entryByNodeIdRef.current = entryByNodeId;
  }, [entryByNodeId]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (tx) => {
          const reordered = resolveBrainCatalogOrderFromNodes(
            tx.nextNodes,
            entryByNodeIdRef.current
          );
          onChangeRef.current(reordered);
        },
      }),
    []
  );

  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'brain_catalog_tree',
    nodes: masterNodes,
    adapter,
  });

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => {
      const entry = entryByNodeId.get(input.node.id);
      if (!entry) return null;
      return (
        <BrainCatalogNodeItem
          node={input.node}
          entry={entry}
          depth={input.depth}
          isSelected={input.isSelected}
          isDragging={input.isDragging}
          select={input.select}
        />
      );
    },
    [entryByNodeId]
  );
  const nodeItemRuntimeValue = useMemo(
    () => ({
      onEdit,
      onRemove,
      isPending,
    }),
    [isPending, onEdit, onRemove]
  );
  const viewportRuntimeValue = useMemo<BrainCatalogTreeViewportRuntimeValue>(
    () => ({
      controller,
      scrollToNodeRef,
      rootDropUi,
      renderNode,
      isPending,
    }),
    [controller, scrollToNodeRef, rootDropUi, renderNode, isPending]
  );

  return (
    <BrainCatalogNodeItemRuntimeContext.Provider value={nodeItemRuntimeValue}>
      <BrainCatalogTreeViewportRuntimeContext.Provider value={viewportRuntimeValue}>
        <BrainCatalogTreeViewport />
      </BrainCatalogTreeViewportRuntimeContext.Provider>
    </BrainCatalogNodeItemRuntimeContext.Provider>
  );
}
