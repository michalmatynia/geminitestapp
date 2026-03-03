'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { FolderTreeViewportV2, useFolderTreeInstanceV2, type FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import type { MasterTreeDropPosition, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { NodeFileDocumentSearchRow } from '../../components/CaseResolverNodeFileUtils';
import { logCaseResolverWorkspaceEvent } from '../../workspace-persistence';
import { RelationTreeNodeItem } from './RelationTreeNodeItem';
import type {
  RelationBrowserMode,
  RelationTreeInstance,
  RelationTreeLookup,
} from '../types';

const DRAG_FILE_ID_TYPE = 'application/case-resolver-file-id';

const areNodeIdListsEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

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

const resolveNodeTypeFromMetadata = (node: FolderTreeViewportRenderNodeInput['node']): 'case' | 'folder' | 'file' => {
  const raw = String(node.metadata?.['relationNodeType'] ?? '');
  if (raw === 'file' || raw === 'case' || raw === 'folder') return raw;
  if (node.kind === 'relation_file') return 'file';
  if (node.kind === 'relation_case') return 'case';
  return 'folder';
};

export function RelationTreeBrowser({
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
}: RelationTreeBrowserProps): React.JSX.Element {
  const controller = useFolderTreeInstanceV2({
    initialNodes: nodes,
    instanceId: instance,
  });

  const dragArmedFileIdRef = useRef<string | null>(null);
  const dropRejectLoggedRef = useRef<boolean>(false);
  const nonSearchExpandedNodeIdsRef = useRef<string[] | null>(null);
  const wasSearchingRef = useRef<boolean>(false);

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

  const rootNodeIds = useMemo(
    () => nodes.filter((node) => node.parentId === null).map((node) => node.id),
    [nodes]
  );
  const nodeIdSet = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const allFolderNodeIds = useMemo(
    () => nodes.filter((node) => node.type === 'folder').map((node) => node.id),
    [nodes]
  );
  const normalizedSearchQuery = searchQuery?.trim() ?? '';
  const isSearching = normalizedSearchQuery.length > 0;

  useEffect(() => {
    const currentExpandedNodeIds = Array.from(controller.expandedNodeIds).filter((nodeId) =>
      nodeIdSet.has(nodeId)
    );
    const ensureExpandedState = (nextExpandedNodeIds: string[]): void => {
      if (areNodeIdListsEqual(currentExpandedNodeIds, nextExpandedNodeIds)) return;
      controller.setExpandedNodeIds(nextExpandedNodeIds);
    };

    if (isSearching) {
      if (!wasSearchingRef.current) {
        nonSearchExpandedNodeIdsRef.current = currentExpandedNodeIds;
      }
      wasSearchingRef.current = true;
      ensureExpandedState(allFolderNodeIds);
      return;
    }

    if (wasSearchingRef.current) {
      wasSearchingRef.current = false;
      const restoredExpandedNodeIds =
        nonSearchExpandedNodeIdsRef.current?.filter((nodeId) => nodeIdSet.has(nodeId)) ?? [];
      const fallbackExpandedNodeIds = restoredExpandedNodeIds.length > 0 ? restoredExpandedNodeIds : rootNodeIds;
      nonSearchExpandedNodeIdsRef.current = fallbackExpandedNodeIds;
      ensureExpandedState(fallbackExpandedNodeIds);
      return;
    }

    if (nonSearchExpandedNodeIdsRef.current === null) {
      const initialExpandedNodeIds = currentExpandedNodeIds.length > 0 ? currentExpandedNodeIds : rootNodeIds;
      nonSearchExpandedNodeIdsRef.current = initialExpandedNodeIds;
      ensureExpandedState(initialExpandedNodeIds);
      return;
    }

    if (!areNodeIdListsEqual(nonSearchExpandedNodeIdsRef.current, currentExpandedNodeIds)) {
      nonSearchExpandedNodeIdsRef.current = currentExpandedNodeIds;
    }
  }, [
    allFolderNodeIds,
    controller.expandedNodeIds,
    controller.setExpandedNodeIds,
    isSearching,
    nodeIdSet,
    rootNodeIds,
  ]);

  const handleArmDragHandle = useCallback((fileId: string): void => {
    if (mode !== 'add_to_node_canvas') return;
    dragArmedFileIdRef.current = fileId;
  }, [mode]);

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
    (input: FolderTreeViewportRenderNodeInput): React.JSX.Element => {
      const nodeType = resolveNodeTypeFromMetadata(input.node);
      const row: NodeFileDocumentSearchRow | null =
        nodeType === 'file' ? (lookup.fileRowByNodeId.get(input.node.id) ?? null) : null;
      const fileId = row?.file.id ?? '';
      const isFileSelected = fileId.length > 0 && (selectedFileIds?.has(fileId) ?? false);
      return (
        <RelationTreeNodeItem
          {...input}
          mode={mode}
          nodeType={nodeType}
          row={row}
          isLocked={isLocked}
          isFileSelected={isFileSelected}
          onToggleFileSelection={onToggleFileSelection}
          onLinkFile={(nextFileId): void => {
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
          }}
          onAddFile={onAddFile}
          onPreviewFile={onPreviewFile}
          onArmDragHandle={handleArmDragHandle}
        />
      );
    },
    [
      handleArmDragHandle,
      isLocked,
      lookup.fileRowByNodeId,
      mode,
      onAddFile,
      onLinkFile,
      onPreviewFile,
      onToggleFileSelection,
      selectedFileIds,
    ]
  );

  return (
    <FolderTreeViewportV2
      controller={controller}
      className={className}
      emptyLabel={emptyLabel}
      enableDnd={mode === 'add_to_node_canvas'}
      canStartDrag={mode === 'add_to_node_canvas' ? canStartDrag : undefined}
      canDrop={mode === 'add_to_node_canvas' ? canDrop : undefined}
      onNodeDragStart={mode === 'add_to_node_canvas' ? handleNodeDragStart : undefined}
      rootDropUi={{ enabled: false }}
      renderNode={renderNode}
    />
  );
}
