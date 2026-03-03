'use client';

import { FileCode2, FileImage, FileText, Folder, FolderOpen, GripVertical } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  FolderTreeViewportV2,
  handleMasterTreeDrop,
  resolveFolderTreeIconSet,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/v2';
import { useMasterFolderTreeSearch } from '@/features/foldertree/v2/search';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { FolderTreePanel } from '@/shared/ui';
import { DRAG_KEYS, resolveVerticalDropPosition, setDragData } from '@/shared/utils/drag-drop';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  CaseResolverFolderTreeProvider,
  useCaseResolverFolderTreeDataContext,
  useCaseResolverFolderTreeUiContext,
  isCaseResolverVirtualSectionNode,
} from '../context/CaseResolverFolderTreeContext';
import {
  emitCaseResolverDropDocumentToCanvas,
  emitCaseResolverShowDocumentInCanvas,
} from '../drag';
import {
  decodeCaseResolverMasterNodeId,
  fromCaseResolverFileNodeId,
  fromCaseResolverFolderNodeId,
} from '../master-tree';
import {
  canStartCaseResolverTreeNodeDrag,
  parseNullableNumber,
  parseNullableString,
  parseString,
  resolveAssetKind,
} from './CaseResolverFolderTree.helpers';
import { CaseResolverTreeHeader } from './CaseResolverTreeHeader';
import { CaseResolverTreeNode } from './CaseResolverTreeNode';
import {
  CaseResolverTreeNodeRuntimeProvider,
  type CaseResolverTreeNodeRuntimeContextValue,
} from './CaseResolverTreeNodeRuntimeContext';

import type { CaseResolverTreeDragPayload } from '@/shared/contracts/case-resolver';

type PendingNodeCanvasAction = {
  kind: 'drop' | 'show';
  fileId: string;
  name: string;
  folder: string;
  nodeId?: string | null;
  relatedNodeFileAssetIds: string[];
  targetNodeFileAssetId?: string | null;
};

function CaseResolverFolderTreeInner(): React.JSX.Element {
  const { selectedAssetId, onLinkRelatedFiles } = useCaseResolverPageContext();

  const {
    masterNodes,
    selectedMasterNodeId,
    initialExpandedFolderNodeIds,
    isNodeFileCanvasActive,
    adapter,
  } = useCaseResolverFolderTreeDataContext();
  const { highlightedFolderAncestorNodeIds, setHighlightedNodeFileAssetIds } =
    useCaseResolverFolderTreeUiContext();

  const { ConfirmationModal } = useConfirm();
  const [pendingNodeCanvasAction, setPendingNodeCanvasAction] =
    useState<PendingNodeCanvasAction | null>(null);
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

  const dragHandleNodeIdRef = React.useRef<string | null>(null);
  const clearDragHandleArming = React.useCallback((): void => {
    dragHandleNodeIdRef.current = null;
  }, []);

  useEffect((): (() => void) => {
    const events = ['dragend', 'drop', 'pointerup', 'pointercancel', 'mouseup', 'blur'] as const;
    events.forEach((eventName) => {
      window.addEventListener(eventName, clearDragHandleArming);
    });
    return (): void => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, clearDragHandleArming);
      });
    };
  }, [clearDragHandleArming]);

  const {
    capabilities,
    appearance: { resolveIcon, rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'case_resolver',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    initiallyExpandedNodeIds: initialExpandedFolderNodeIds,
    adapter,
  });

  const searchState = useMasterFolderTreeSearch(
    masterNodes,
    treeSearchQuery,
    {
      config: capabilities.search,
    }
  );

  const canStartTreeDrag = React.useCallback(
    ({
      node,
      event,
    }: {
      node: MasterTreeNode;
      event: React.DragEvent<HTMLDivElement>;
    }): boolean => {
      const blockedVirtualSectionNode = isCaseResolverVirtualSectionNode(node);
      const eventTarget = event.target;
      const fromEventTargetHandle =
        eventTarget instanceof Element &&
        eventTarget.closest('[data-master-tree-drag-handle="true"]') !== null;
      let fromPointerHandle = false;
      if (typeof document !== 'undefined') {
        const pointerElement = document.elementFromPoint(event.clientX, event.clientY);
        fromPointerHandle =
          pointerElement?.closest('[data-master-tree-drag-handle="true"]') !== null;
      }
      const fromHandleGesture = fromEventTargetHandle || fromPointerHandle;
      if (fromHandleGesture) {
        dragHandleNodeIdRef.current = node.id;
      }

      return canStartCaseResolverTreeNodeDrag({
        nodeType: node.type,
        nodeId: node.id,
        isVirtualSectionNode: blockedVirtualSectionNode,
        fromHandleGesture,
        armedNodeId: dragHandleNodeIdRef.current,
      });
    },
    []
  );

  const armDragHandle = React.useCallback((nodeId: string): void => {
    dragHandleNodeIdRef.current = nodeId;
  }, []);

  const releaseDragHandle = React.useCallback((): void => {
    clearDragHandleArming();
  }, [clearDragHandleArming]);

  useEffect(() => {
    if (highlightedFolderAncestorNodeIds.length === 0) return;
    const nextExpandedNodeIds = new Set<string>(
      Array.from(controller.expandedNodeIds).map((nodeId): string => String(nodeId))
    );
    let changed = false;
    highlightedFolderAncestorNodeIds.forEach((folderNodeId: string): void => {
      if (nextExpandedNodeIds.has(folderNodeId)) return;
      nextExpandedNodeIds.add(folderNodeId);
      changed = true;
    });
    if (!changed) return;
    controller.setExpandedNodeIds(Array.from(nextExpandedNodeIds));
  }, [controller, highlightedFolderAncestorNodeIds]);

  useEffect(() => {
    if (!pendingNodeCanvasAction) return;
    if (!isNodeFileCanvasActive) return;
    if (
      pendingNodeCanvasAction.targetNodeFileAssetId &&
      selectedAssetId !== pendingNodeCanvasAction.targetNodeFileAssetId
    ) {
      return;
    }

    const timeoutId = window.setTimeout((): void => {
      if (pendingNodeCanvasAction.kind === 'drop') {
        emitCaseResolverDropDocumentToCanvas({
          fileId: pendingNodeCanvasAction.fileId,
          name: pendingNodeCanvasAction.name,
          folder: pendingNodeCanvasAction.folder,
        });
      } else {
        setHighlightedNodeFileAssetIds(pendingNodeCanvasAction.relatedNodeFileAssetIds);
        emitCaseResolverShowDocumentInCanvas({
          fileId: pendingNodeCanvasAction.fileId,
          nodeId: pendingNodeCanvasAction.nodeId ?? null,
          relatedNodeFileAssetIds: pendingNodeCanvasAction.relatedNodeFileAssetIds,
        });
      }
      setPendingNodeCanvasAction(null);
    }, 0);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isNodeFileCanvasActive,
    pendingNodeCanvasAction,
    selectedAssetId,
    setHighlightedNodeFileAssetIds,
  ]);

  const {
    FolderClosedIcon,
    FolderOpenIcon,
    DefaultFileIcon,
    ScanCaseFileIcon,
    NodeFileIcon,
    ImageFileIcon,
    PdfFileIcon,
    DragHandleIcon,
  } = useMemo(
    () =>
      resolveFolderTreeIconSet(resolveIcon, {
        FolderClosedIcon: {
          slot: 'folderClosed',
          kind: 'folder',
          fallback: Folder,
          fallbackId: 'Folder',
        },
        FolderOpenIcon: {
          slot: 'folderOpen',
          kind: 'folder',
          fallback: FolderOpen,
          fallbackId: 'FolderOpen',
        },
        DefaultFileIcon: {
          slot: 'file',
          kind: 'case_file',
          fallback: FileText,
          fallbackId: 'FileText',
        },
        ScanCaseFileIcon: {
          slot: 'file',
          kind: 'case_file_scan',
          fallback: FileImage,
          fallbackId: 'FileImage',
        },
        NodeFileIcon: {
          slot: 'file',
          kind: 'node_file',
          fallback: FileCode2,
          fallbackId: 'FileCode2',
        },
        ImageFileIcon: {
          slot: 'file',
          kind: 'asset_image',
          fallback: FileImage,
          fallbackId: 'FileImage',
        },
        PdfFileIcon: {
          slot: 'file',
          kind: 'asset_pdf',
          fallback: FileText,
          fallbackId: 'FileText',
        },
        DragHandleIcon: {
          slot: 'dragHandle',
          fallback: GripVertical,
          fallbackId: 'GripVertical',
        },
      }),
    [resolveIcon]
  );

  const caseResolverTreeNodeRuntimeValue = useMemo(
    (): CaseResolverTreeNodeRuntimeContextValue => ({
      armDragHandle,
      releaseDragHandle,
      renameDraft: controller.renameDraft,
      onUpdateRenameDraft: (value: string): void => {
        controller.updateRenameDraft(value);
      },
      onCommitRename: (): void => {
        void controller.commitRename();
      },
      onCancelRename: (): void => {
        controller.cancelRename();
      },
      FolderClosedIcon,
      FolderOpenIcon,
      DefaultFileIcon,
      ScanCaseFileIcon,
      NodeFileIcon,
      ImageFileIcon,
      PdfFileIcon,
      DragHandleIcon,
    }),
    [
      armDragHandle,
      releaseDragHandle,
      controller,
      controller.renameDraft,
      FolderClosedIcon,
      FolderOpenIcon,
      DefaultFileIcon,
      ScanCaseFileIcon,
      NodeFileIcon,
      ImageFileIcon,
      PdfFileIcon,
      DragHandleIcon,
    ]
  );

  return (
    <FolderTreePanel
      className='border-border bg-gray-900'
      bodyClassName='flex min-h-0 flex-1 flex-col'
      masterInstance='case_resolver'
      header={
        <CaseResolverTreeHeader searchQuery={treeSearchQuery} onSearchChange={setTreeSearchQuery} />
      }
    >
      <div className='min-h-0 flex-1 overflow-auto p-2'>
        <CaseResolverTreeNodeRuntimeProvider value={caseResolverTreeNodeRuntimeValue}>
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            searchState={searchState}
            multiSelectConfig={capabilities.multiSelect}
            canStartDrag={canStartTreeDrag}
            rootDropUi={rootDropUi}
            canDrop={({ draggedNodeId, targetId, position, defaultAllowed }): boolean => {
              const draggedNode = controller.nodes.find(
                (candidate: MasterTreeNode): boolean => candidate.id === draggedNodeId
              );
              if (draggedNode && isCaseResolverVirtualSectionNode(draggedNode)) return false;
              const targetNode = targetId
                ? controller.nodes.find(
                  (candidate: MasterTreeNode): boolean => candidate.id === targetId
                )
                : null;
              if (targetNode && isCaseResolverVirtualSectionNode(targetNode)) return false;
              if (defaultAllowed) return true;
              const dragged = decodeCaseResolverMasterNodeId(draggedNodeId);
              if (!dragged) return false;
              if (dragged.entity !== 'file' && dragged.entity !== 'asset') return false;

              if (position === 'inside') {
                if (targetId === null) return true;
                if (fromCaseResolverFolderNodeId(targetId) !== null) return true;
                // Allow file-on-file center drop for relation linking
                const targetFileId = fromCaseResolverFileNodeId(targetId);
                const draggedFileId = fromCaseResolverFileNodeId(draggedNodeId);
                return !!(targetFileId && draggedFileId && targetFileId !== draggedFileId);
              }

              return targetId !== null;
            }}
            resolveDropPosition={(event, { draggedNodeId, targetId }, ctlr) => {
              const targetNode = ctlr.nodes.find(
                (candidate: MasterTreeNode): boolean => candidate.id === targetId
              );
              if (targetNode?.type === 'folder') {
                return 'inside';
              }
              // File-on-file: whole row is a link drop zone
              const draggedFileId = fromCaseResolverFileNodeId(draggedNodeId);
              const targetFileId = fromCaseResolverFileNodeId(targetId);
              if (draggedFileId && targetFileId && draggedFileId !== targetFileId) {
                return 'inside';
              }
              const targetRect = event.currentTarget.getBoundingClientRect();
              const edgePosition = resolveVerticalDropPosition(event.clientY, targetRect, {
                thresholdRatio: 0.34,
              });
              return edgePosition ?? 'after';
            }}
            onNodeDragStart={({ node, event }): void => {
              const metadata = node.metadata;
              if (!metadata || typeof metadata !== 'object') return;

              let payload: CaseResolverTreeDragPayload | null = null;
              if (metadata['entity'] === 'asset') {
                const assetId = parseString(metadata['rawId']);
                if (!assetId) return;
                payload = {
                  source: 'case_resolver_tree',
                  entity: 'asset',
                  assetId,
                  assetKind: resolveAssetKind(metadata['assetKind']),
                  name: node.name,
                  folder: parseString(metadata['folder']),
                  filepath: parseNullableString(metadata['filepath']),
                  mimeType: parseNullableString(metadata['mimeType']),
                  size: parseNullableNumber(metadata['size']),
                  textContent: parseString(metadata['textContent']),
                  description: parseString(metadata['description']),
                };
              }

              if (metadata['entity'] === 'file') {
                const fileId = parseString(metadata['rawId']);
                if (!fileId) return;
                payload = {
                  source: 'case_resolver_tree',
                  entity: 'file',
                  fileId,
                  name: node.name,
                  folder: parseString(metadata['folder']),
                };
              }

              if (!payload) return;

              setDragData(
                event.dataTransfer,
                { [DRAG_KEYS.CASE_RESOLVER_ITEM]: JSON.stringify(payload) },
                { text: payload.name, effectAllowed: 'copyMove' }
              );
            }}
            onNodeDrop={async (
              { draggedNodeId, targetId, position, rootDropZone },
              ctlr
            ): Promise<void> => {
              await handleMasterTreeDrop({
                input: {
                  draggedNodeId,
                  targetId,
                  position,
                  rootDropZone,
                },
                controller: ctlr,
                onInternalDrop: ({ input }): boolean => {
                  // File-on-file center drop → link as related documents
                  if (input.position !== 'inside' || input.targetId === null) return false;
                  const draggedFileId = fromCaseResolverFileNodeId(input.draggedNodeId);
                  const targetFileId = fromCaseResolverFileNodeId(input.targetId);
                  if (!draggedFileId || !targetFileId) return false;
                  onLinkRelatedFiles(draggedFileId, targetFileId);
                  return true;
                },
              });
            }}
            renderNode={(nodeProps: FolderTreeViewportRenderNodeInput) => (
              <CaseResolverTreeNode {...nodeProps} />
            )}
          />
        </CaseResolverTreeNodeRuntimeProvider>
      </div>
      <ConfirmationModal />
    </FolderTreePanel>
  );
}

export function CaseResolverFolderTree(): React.JSX.Element {
  return (
    <CaseResolverFolderTreeProvider>
      <CaseResolverFolderTreeInner />
    </CaseResolverFolderTreeProvider>
  );
}
