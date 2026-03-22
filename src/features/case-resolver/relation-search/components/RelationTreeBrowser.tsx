'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  FolderTreeViewportV2,
  useFolderTreeInstanceV2,
  useSharedMasterFolderTreeRuntime,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/public';
import { useMasterFolderTreeSearch } from '@/features/foldertree/public';
import { useFolderTreeProfile } from '@/features/foldertree/public';
import {
  resolveFolderTreeMultiSelectConfig,
  resolveFolderTreeSearchConfig,
} from '@/shared/utils/folder-tree-profiles-v2';
import type {
  MasterTreeDropPosition,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';

import { useOptionalRelationTreeBrowserRuntime } from './RelationTreeBrowserRuntimeContext';
import { RelationTreeNodeItem } from './RelationTreeNodeItem';
import { RelationTreeNodeRuntimeProvider } from './RelationTreeNodeRuntimeContext';
import { logCaseResolverWorkspaceEvent } from '../../workspace-persistence';

import type { RelationBrowserMode, RelationTreeInstance, RelationTreeLookup } from '../types';

const DRAG_FILE_ID_TYPE = 'application/case-resolver-file-id';

type RelationTreeBrowserProps = {
  instance?: RelationTreeInstance | undefined;
  mode: RelationBrowserMode;
  nodes?: MasterTreeNode[] | undefined;
  lookup?: RelationTreeLookup | undefined;
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
    isLocked,
    selectedFileIds,
    onToggleFileSelection,
    onLinkFile,
    onAddFile,
    onPreviewFile,
    searchQuery,
    className,
    emptyLabel = 'No files found',
  } = props;
  const browserRuntimeContext = useOptionalRelationTreeBrowserRuntime();
  const resolvedInstance = instance ?? browserRuntimeContext?.instance;
  const resolvedNodes = nodes ?? browserRuntimeContext?.nodes;
  const resolvedLookup = lookup ?? browserRuntimeContext?.lookup;
  const resolvedIsLocked = isLocked ?? browserRuntimeContext?.isLocked ?? false;
  const resolvedSelectedFileIds = selectedFileIds ?? browserRuntimeContext?.selectedFileIds;
  const resolvedOnToggleFileSelection =
    onToggleFileSelection ?? browserRuntimeContext?.onToggleFileSelection;
  const resolvedOnLinkFile = onLinkFile ?? browserRuntimeContext?.onLinkFile;
  const resolvedOnPreviewFile = onPreviewFile ?? browserRuntimeContext?.onPreviewFile;
  const resolvedSearchQuery = searchQuery ?? browserRuntimeContext?.searchQuery ?? '';
  const resolvedOnAddFile = onAddFile ?? browserRuntimeContext?.onAddFile;

  if (!resolvedInstance || !resolvedNodes || !resolvedLookup) {
    throw new Error(
      'RelationTreeBrowser must be used within RelationTreeBrowserRuntimeProvider or receive explicit props'
    );
  }

  const profile = useFolderTreeProfile(resolvedInstance);
  const searchConfig = useMemo(() => resolveFolderTreeSearchConfig(profile), [profile]);
  const multiSelectConfig = useMemo(() => resolveFolderTreeMultiSelectConfig(profile), [profile]);
  const runtime = useSharedMasterFolderTreeRuntime({ bindWindowKeydown: false });
  const controller = useFolderTreeInstanceV2({
    initialNodes: resolvedNodes,
    profile,
    instanceId: resolvedInstance,
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
    void controller.replaceNodes(resolvedNodes, 'external_sync');
    logCaseResolverWorkspaceEvent({
      source: 'relation_tree_browser',
      action: 'relation_tree_built',
      message: `instance=${resolvedInstance} mode=${mode} nodes=${resolvedNodes.length}`,
    });
  }, [controller.replaceNodes, resolvedInstance, mode, resolvedNodes]);

  useEffect(() => {
    if (!resolvedSearchQuery || resolvedSearchQuery.trim().length === 0) return;
    logCaseResolverWorkspaceEvent({
      source: 'relation_tree_browser',
      action: 'relation_tree_search_applied',
      message: `instance=${resolvedInstance} mode=${mode} query=${resolvedSearchQuery
        .trim()
        .slice(0, 64)}`,
    });
  }, [resolvedInstance, mode, resolvedSearchQuery]);

  const searchState = useMasterFolderTreeSearch(resolvedNodes, resolvedSearchQuery, {
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
      const row = resolvedLookup.fileRowByNodeId.get(node.id);
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
    [resolvedLookup.fileRowByNodeId, mode]
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
      const row = resolvedLookup.fileRowByNodeId.get(node.id);
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
    [clearDragHandleArm, resolvedLookup.fileRowByNodeId, mode]
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
      lookup: resolvedLookup,
      isLocked: resolvedIsLocked,
      selectedFileIds: resolvedSelectedFileIds,
      onToggleFileSelection: resolvedOnToggleFileSelection,
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
          resolvedOnLinkFile?.(nextFileId);
          return;
        }
        resolvedOnAddFile?.(nextFileId);
      },
      onAddFile: resolvedOnAddFile,
      onPreviewFile: resolvedOnPreviewFile,
      onArmDragHandle: handleArmDragHandle,
    }),
    [
      handleArmDragHandle,
      resolvedIsLocked,
      resolvedLookup,
      mode,
      resolvedOnAddFile,
      resolvedOnLinkFile,
      resolvedOnPreviewFile,
      resolvedOnToggleFileSelection,
      resolvedSelectedFileIds,
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
