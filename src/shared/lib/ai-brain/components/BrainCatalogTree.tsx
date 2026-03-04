'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/v2';

import type { AiBrainCatalogEntry } from '../settings';
import { BrainCatalogNodeItem } from './BrainCatalogNodeItem';
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
          const reordered = resolveBrainCatalogOrderFromNodes(tx.nextNodes, entryByNodeIdRef.current);
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
          onEdit={onEdit}
          onRemove={onRemove}
          isPending={isPending}
        />
      );
    },
    [entryByNodeId, isPending, onEdit, onRemove]
  );

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
