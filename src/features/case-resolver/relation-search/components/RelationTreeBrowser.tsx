'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  FolderTreeViewportV2,
  useFolderTreeInstanceV2,
  useSharedMasterFolderTreeRuntime,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/v2';
import { useMasterFolderTreeSearch } from '@/features/foldertree/v2/search';
import type {
  MasterTreeDropPosition,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';
import {
  defaultFolderTreeProfilesV2,
  resolveFolderTreeMultiSelectConfig,
  resolveFolderTreeSearchConfig,
} from '@/shared/utils/folder-tree-profiles-v2';

import { logCaseResolverWorkspaceEvent } from '../../workspace-persistence';
import { RelationTreeNodeItem } from './RelationTreeNodeItem';
import { RelationTreeNodeRuntimeProvider } from './RelationTreeNodeRuntimeContext';
import type { RelationBrowserMode, RelationTreeInstance, RelationTreeLookup } from '../types';

const DRAG_FILE_ID_TYPE = 'application/case-resolver-file-id';

type RelationTreeBrowserProps = {
  instance: RelationTreeInstance;
  mode: RelationBrowserMode;
  nodes: MasterTreeNode[];
  lookup: RelationTreeLookup;
  isLocked?: boolean | undefined;
  selectedFileIds?: Set<string> | undefined;
  onToggleFileSelection?: ((fileId: string) => void) | undefined;
  onLinkFile?: ((fileId: string) => void) | undefined;
  onAddFile?: ((fileId: string) => void) | undefined;
  onPreviewFile?: ((fileId: string) => void) | undefined;
  searchQuery?: string | undefined;
  className?: string | undefined;
  emptyLabel?: string | undefined;
};

const resolveNodeTypeFromMetadata = (
  node: FolderTreeViewportRenderNodeInput['node']
): 'case' | 'folder' | 'file' => {
  const raw = String(node.metadata?.['relationNodeType'] ?? '');
  if (raw === 'file' || raw === 'case' || raw === 'folder') return raw;
  if (node.kind === 'relation_file') return 'file';
  if (node.kind === 'relation_case') return 'case';
  return 'folder';
};

export function RelationTreeBrowser(props: RelationTreeBrowserProps): React.JSX.Element {
  const {
    instance,
    mode,
    nodes,
    lookup,
    isLocked = false,
    selectedFileIds,
    onToggleFileSelection,
    onLinkFile,
    onAddFile,
    onPreviewFile,
    searchQuery,
    className,
    emptyLabel = 'No files found',
  } = props;

  const profile = useMemo(() => defaultFolderTreeProfilesV2[instance], [instance]);
  const searchConfig = useMemo(() => resolveFolderTreeSearchConfig(profile), [profile]);
  const multiSelectConfig = useMemo(() => resolveFolderTreeMultiSelectConfig(profile), [profile]);
  const runtime = useSharedMasterFolderTreeRuntime({ bindWindowKeydown: false });
  const controller = useFolderTreeInstanceV2({
    initialNodes: nodes,
    profile,
    instanceId: instance,
    runtime,
  });

  const dragArmedFileIdRef = useRef<string | null>(null);
  const dropRejectLoggedRef = useRef<boolean>(false);

  const clearDragHandleArm = useCallback((): void => {
    dragArmedFileIdRef.current = null;
    dropRejectLoggedRef.current = false;
  }, []);

  useEffect(() => {
    const handleClear = (): void => {
      clearDragHandleArm();
    };
    window.addEventListener('pointerup', handleClear);
    window.addEventListener('pointercancel', handleClear);
    window.addEventListener('mouseup', handleClear);
    window.addEventListener('dragend', handleClear);
    window.addEventListener('drop', handleClear);
    window.addEventListener('blur', handleClear);
    return (): void => {
      window.removeEventListener('pointerup', handleClear);
      window.removeEventListener('pointercancel', handleClear);
      window.removeEventListener('mouseup', handleClear);
      window.removeEventListener('dragend', handleClear);
      window.removeEventListener('drop', handleClear);
      window.removeEventListener('blur', handleClear);
    };
  }, [clearDragHandleArm]);

  useEffect(() => {
    void controller.replaceNodes(nodes, 'external_sync');
    logCaseResolverWorkspaceEvent({
      source: 'relation_tree_browser',
      action: 'relation_tree_built',
      message: `instance=${instance} mode=${mode} nodes=${nodes.length}`,
    });
  }, [controller.replaceNodes, instance, mode, nodes]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length === 0) return;
    logCaseResolverWorkspaceEvent({
      source: 'relation_tree_browser',
      action: 'relation_tree_search_applied',
      message: `instance=${instance} mode=${mode} query=${searchQuery.trim().slice(0, 64)}`,
    });
  }, [instance, mode, searchQuery]);

  const searchState = useMasterFolderTreeSearch(nodes, searchQuery ?? '', {
    config: searchConfig,
  });

  const handleArmDragHandle = useCallback(
    (fileId: string): void => {
      if (mode !== 'add_to_node_canvas') return;
      dragArmedFileIdRef.current = fileId;
    },
    [mode]
  );

  const canStartDrag = useCallback(
    ({ node }: { node: FolderTreeViewportRenderNodeInput['node'] }): boolean => {
      if (mode !== 'add_to_node_canvas') return false;
      const nodeType = resolveNodeTypeFromMetadata(node);
      if (nodeType !== 'file') return false;
      const row = lookup.fileRowByNodeId.get(node.id);
      if (!row) return false;
      const isArmed = dragArmedFileIdRef.current === row.file.id;
      if (!isArmed && !dropRejectLoggedRef.current) {
        dropRejectLoggedRef.current = true;
        logCaseResolverWorkspaceEvent({
          source: 'relation_tree_browser',
          action: 'relation_tree_drop_rejected',
          message: 'drag_start_rejected_not_handle_armed',
        });
      }
      return isArmed;
    },
    [lookup.fileRowByNodeId, mode]
  );

  const canDrop = useCallback(
    ({
      position,
      targetId,
    }: {
      draggedNodeId: string;
      targetId: string | null;
      position: MasterTreeDropPosition;
      defaultAllowed: boolean;
    }): boolean => {
      if (mode !== 'add_to_node_canvas') return false;
      if (!dropRejectLoggedRef.current) {
        dropRejectLoggedRef.current = true;
        logCaseResolverWorkspaceEvent({
          source: 'relation_tree_browser',
          action: 'relation_tree_drop_rejected',
          message: `target=${targetId ?? 'root'} position=${position}`,
        });
      }
      return false;
    },
    [mode]
  );

  const handleNodeDragStart = useCallback(
    ({
      node,
      event,
    }: {
      node: FolderTreeViewportRenderNodeInput['node'];
      event: React.DragEvent<HTMLDivElement>;
    }): void => {
      if (mode !== 'add_to_node_canvas') return;
      const row = lookup.fileRowByNodeId.get(node.id);
      if (!row) return;
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData(DRAG_FILE_ID_TYPE, row.file.id);
      logCaseResolverWorkspaceEvent({
        source: 'relation_tree_browser',
        action: 'relation_tree_node_drag_started',
        message: `file_id=${row.file.id}`,
      });
      clearDragHandleArm();
    },
    [clearDragHandleArm, lookup.fileRowByNodeId, mode]
  );

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.JSX.Element => (
      <RelationTreeNodeItem {...input} />
    ),
    []
  );

  const nodeRuntimeContextValue = useMemo(
    () => ({
      mode,
      lookup,
      isLocked,
      selectedFileIds,
      onToggleFileSelection,
      onLinkFile: (nextFileId: string): void => {
        logCaseResolverWorkspaceEvent({
          source: 'relation_tree_browser',
          action:
            mode === 'link_relations'
              ? 'relation_tree_node_link_clicked'
              : 'relation_tree_node_add_clicked',
          message: `file_id=${nextFileId}`,
        });
        if (mode === 'link_relations') {
          onLinkFile?.(nextFileId);
          return;
        }
        onAddFile?.(nextFileId);
      },
      onAddFile,
      onPreviewFile,
      onArmDragHandle: handleArmDragHandle,
    }),
    [
      handleArmDragHandle,
      isLocked,
      lookup,
      mode,
      onAddFile,
      onLinkFile,
      onPreviewFile,
      onToggleFileSelection,
      selectedFileIds,
    ]
  );

  return (
    <RelationTreeNodeRuntimeProvider value={nodeRuntimeContextValue}>
      <FolderTreeViewportV2
        controller={controller}
        className={className}
        emptyLabel={emptyLabel}
        searchState={searchState}
        multiSelectConfig={multiSelectConfig}
        enableDnd={mode === 'add_to_node_canvas'}
        runtime={runtime}
        canStartDrag={mode === 'add_to_node_canvas' ? canStartDrag : undefined}
        canDrop={mode === 'add_to_node_canvas' ? canDrop : undefined}
        onNodeDragStart={mode === 'add_to_node_canvas' ? handleNodeDragStart : undefined}
        rootDropUi={{ enabled: false }}
        renderNode={renderNode}
      />
    </RelationTreeNodeRuntimeProvider>
  );
}
