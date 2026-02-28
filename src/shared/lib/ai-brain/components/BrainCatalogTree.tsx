'use client';

import React, { useCallback, useEffect, useMemo } from 'react';

import {
  applyInternalMasterTreeDrop,
  FolderTreeViewportV2,
  MasterFolderTreeRuntimeProvider,
  type FolderTreeViewportRenderNodeInput,
  useFolderTreeInstanceV2,
} from '@/features/foldertree/v2';
import type {
  FolderTreeProfileV2,
  MasterFolderTreeController,
} from '@/shared/contracts/master-folder-tree';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
} from '@/shared/utils/master-folder-tree-contract';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { useToast } from '@/shared/ui';

import type { AiBrainCatalogEntry } from '../settings';
import { BrainCatalogNodeItem } from './BrainCatalogNodeItem';
import {
  buildBrainCatalogMasterNodes,
  createBrainCatalogNodeEntryMap,
  resolveBrainCatalogOrderFromNodes,
} from './brain-catalog-master-tree';

const BRAIN_CATALOG_TREE_PROFILE: FolderTreeProfileV2 = {
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
      {
        childType: 'file',
        childKinds: ['brain-catalog-entry'],
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
  const { toast } = useToast();

  const masterNodes = useMemo(() => buildBrainCatalogMasterNodes(entries), [entries]);

  const controller = useFolderTreeInstanceV2({
    instanceId: 'brain_catalog_tree',
    profile: BRAIN_CATALOG_TREE_PROFILE,
    initialNodes: masterNodes,
  });

  useEffect(() => {
    void controller.replaceNodes(masterNodes, 'external_sync');
  }, [masterNodes]);

  const entryByNodeId = useMemo(() => createBrainCatalogNodeEntryMap(entries), [entries]);

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
      await applyInternalMasterTreeDrop({
        controller: ctrlr,
        draggedNodeId: input.draggedNodeId,
        targetId: input.targetId,
        position: input.position,
        rootDropZone: input.rootDropZone,
      });

      try {
        const reordered = resolveBrainCatalogOrderFromNodes(ctrlr.nodes, entryByNodeId);
        onChange(reordered);
      } catch (error: unknown) {
        logClientError(error, {
          context: { source: 'BrainCatalogTree', action: 'reorder' },
        });
        toast(error instanceof Error ? error.message : 'Failed to reorder catalog entries.', {
          variant: 'error',
        });
      }
    },
    [entryByNodeId, onChange, toast]
  );

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
    <MasterFolderTreeRuntimeProvider>
      <FolderTreeViewportV2
        controller={controller}
        renderNode={renderNode}
        onNodeDrop={onNodeDrop}
        enableDnd={!isPending}
        emptyLabel='No catalog entries'
      />
    </MasterFolderTreeRuntimeProvider>
  );
}

