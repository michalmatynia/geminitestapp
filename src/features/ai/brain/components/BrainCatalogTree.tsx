'use client';

import React, { useCallback, useMemo } from 'react';

import {
  createMasterFolderTreeOrderedItemsAdapter,
  MasterFolderTreeViewport,
  useMasterFolderTreeViewModel,
  type FolderTreeViewportRenderNodeInput,
  type MasterFolderTreeViewportProps,
  type MasterFolderTreeAdapterV3,
} from '@/shared/lib/foldertree/public';

import {
  buildBrainCatalogMasterNodes,
  createBrainCatalogNodeEntryMap,
  resolveBrainCatalogOrderFromNodes,
  toBrainCatalogNodeId,
} from './brain-catalog-master-tree';
import { BrainCatalogNodeItem, BrainCatalogNodeItemRuntimeContext } from './BrainCatalogNodeItem';

import type { AiBrainCatalogEntry } from '../settings';

export interface BrainCatalogTreeProps {
  entries: AiBrainCatalogEntry[];
  onChange: (entries: AiBrainCatalogEntry[]) => void;
  onEdit: (entry: AiBrainCatalogEntry) => void;
  onRemove: (entry: AiBrainCatalogEntry) => void;
  isPending?: boolean;
}

type BrainCatalogTreeViewportRuntimeValue = Pick<
  MasterFolderTreeViewportProps,
  'tree' | 'renderNode'
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
  const { tree, renderNode, isPending } =
    useBrainCatalogTreeViewportRuntime();
  return (
    <MasterFolderTreeViewport
      tree={tree}
      renderNode={renderNode}
      enableDnd={!isPending}
      emptyLabel='No catalog entries'
    />
  );
}

function useBrainCatalogTreeAdapter({
  entries,
  entryByNodeId,
  onChange,
}: {
  entries: AiBrainCatalogEntry[];
  entryByNodeId: Map<string, AiBrainCatalogEntry>;
  onChange: (entries: AiBrainCatalogEntry[]) => void;
}): MasterFolderTreeAdapterV3 {
  return useMemo(
    () =>
      createMasterFolderTreeOrderedItemsAdapter({
        items: entries,
        itemById: entryByNodeId,
        getItemId: toBrainCatalogNodeId,
        resolveOrderedItemsFromNodes: resolveBrainCatalogOrderFromNodes,
        onPersistItems: onChange,
      }),
    [entries, entryByNodeId, onChange]
  );
}

function useBrainCatalogTreeData({
  entries,
  onChange,
}: {
  entries: AiBrainCatalogEntry[];
  onChange: (entries: AiBrainCatalogEntry[]) => void;
}): {
  masterNodes: ReturnType<typeof buildBrainCatalogMasterNodes>;
  entryByNodeId: Map<string, AiBrainCatalogEntry>;
  adapter: MasterFolderTreeAdapterV3;
} {
  const masterNodes = useMemo(() => buildBrainCatalogMasterNodes(entries), [entries]);
  const entryByNodeId = useMemo(() => createBrainCatalogNodeEntryMap(entries), [entries]);
  const adapter = useBrainCatalogTreeAdapter({ entries, entryByNodeId, onChange });

  return { masterNodes, entryByNodeId, adapter };
}

export function BrainCatalogTree({
  entries,
  onChange,
  onEdit,
  onRemove,
  isPending = false,
}: BrainCatalogTreeProps): React.JSX.Element {
  const { masterNodes, entryByNodeId, adapter } = useBrainCatalogTreeData({ entries, onChange });

  const tree = useMasterFolderTreeViewModel({
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
      tree,
      renderNode,
      isPending,
    }),
    [tree, renderNode, isPending]
  );

  return (
    <BrainCatalogNodeItemRuntimeContext.Provider value={nodeItemRuntimeValue}>
      <BrainCatalogTreeViewportRuntimeContext.Provider value={viewportRuntimeValue}>
        <BrainCatalogTreeViewport />
      </BrainCatalogTreeViewportRuntimeContext.Provider>
    </BrainCatalogNodeItemRuntimeContext.Provider>
  );
}
