'use client';

import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileImage,
  FilePlus,
  FileText,
  Eye,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Lock,
  Pencil,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import {
  applyInternalMasterTreeDrop,
  isInternalMasterTreeNode,
  MasterFolderTree,
  type MasterFolderTreeProps,
  useMasterFolderTreeInstance,
} from '@/features/foldertree';
import {
  type CaseResolverAssetFile,
  type CaseResolverFile,
  type CaseResolverIdentifier,
  type CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { Button, FolderTreePanel } from '@/shared/ui';
import {
  DRAG_KEYS,
  resolveVerticalDropPosition,
  setDragData,
} from '@/shared/utils/drag-drop';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { createCaseResolverMasterTreeAdapter } from '../adapter';
import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  emitCaseResolverDropDocumentToCanvas,
  emitCaseResolverShowDocumentInCanvas,
  type CaseResolverTreeDragPayload,
} from '../drag';
import {
  buildMasterNodesFromCaseResolverWorkspace,
  decodeCaseResolverMasterNodeId,
  fromCaseResolverAssetNodeId,
  fromCaseResolverFileNodeId,
  fromCaseResolverFolderNodeId,
  toCaseResolverAssetNodeId,
  toCaseResolverFileNodeId,
  toCaseResolverFolderNodeId,
} from '../master-tree';
import {
  buildCaseResolverNodeFileRelationIndexFromAssets,
  EMPTY_CASE_RESOLVER_NODE_FILE_RELATION_INDEX,
} from '../nodefile-relations';
import { resolveCaseResolverTreeWorkspace } from './case-resolver-tree-workspace';
import {
  parseNullableNumber,
  parseNullableString,
  parseString,
  resolveAssetKind,
  type FolderCaseFileStats,
} from './CaseResolverFolderTree.helpers';


const resolveFolderAncestorNodeIds = (folderPath: string): string[] => {
  const normalizedFolder = folderPath.trim();
  if (!normalizedFolder) return [];
  const parts = normalizedFolder.split('/').filter(Boolean);
  return parts.map((_: string, index: number): string =>
    toCaseResolverFolderNodeId(parts.slice(0, index + 1).join('/')),
  );
};

const areStringArraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((value: string, index: number): boolean => value === right[index]);

type PendingNodeCanvasAction = {
  kind: 'drop' | 'show';
  fileId: string;
  name: string;
  folder: string;
  nodeId?: string | null;
  relatedNodeFileAssetIds: string[];
  targetNodeFileAssetId?: string | null;
};

export function CaseResolverFolderTree(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');
  const {
    workspace,
    activeCaseId,
    requestedCaseStatus,
    canCreateInActiveCase,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    activeFile,
    onDeactivateActiveFile,
    onSelectFile,
    onSelectAsset,
    onSelectFolder,
    onCreateFolder,
    onCreateFile,
    onCreateScanFile,
    onCreateNodeFile,
    onMoveFile,
    onMoveAsset,
    onMoveFolder,
    onRenameFile,
    onRenameAsset,
    onRenameFolder,
    onDeleteFolder,
    onToggleFolderLock,
    onDeleteFile,
    onDeleteAsset,
    onToggleFileLock,
    onEditFile,
    caseResolverIdentifiers,
    onLinkRelatedFiles,
  } = useCaseResolverPageContext();
  const { ConfirmationModal } = useConfirm();
  const [highlightedNodeFileAssetIds, setHighlightedNodeFileAssetIds] =
    useState<string[]>([]);
  const [pendingNodeCanvasAction, setPendingNodeCanvasAction] =
    useState<PendingNodeCanvasAction | null>(null);
  const dragHandleNodeIdRef = React.useRef<string | null>(null);

  useEffect((): (() => void) => {
    const clearDragHandleArming = (): void => {
      dragHandleNodeIdRef.current = null;
    };
    window.addEventListener('dragend', clearDragHandleArming);
    return (): void => {
      window.removeEventListener('dragend', clearDragHandleArming);
    };
  }, []);

  const treeWorkspace = useMemo(
    (): CaseResolverWorkspace =>
      resolveCaseResolverTreeWorkspace({
        selectedFileId,
        requestedFileId,
        workspace,
      }),
    [requestedFileId, selectedFileId, workspace],
  );

  const isNodeFileCanvasActive = useMemo(
    (): boolean =>
      Boolean(selectedAssetId) &&
      workspace.assets.some(
        (asset: CaseResolverAssetFile) => asset.id === selectedAssetId && asset.kind === 'node_file',
      ),
    [selectedAssetId, workspace.assets],
  );

  const masterNodes = useMemo(
    (): MasterTreeNode[] =>
      buildMasterNodesFromCaseResolverWorkspace(treeWorkspace),
    [treeWorkspace],
  );

  const selectedMasterNodeId = useMemo((): string | null => {
    if (selectedFileId) return toCaseResolverFileNodeId(selectedFileId);
    if (selectedAssetId) return toCaseResolverAssetNodeId(selectedAssetId);
    if (selectedFolderPath !== null) {
      return toCaseResolverFolderNodeId(selectedFolderPath);
    }
    return null;
  }, [selectedAssetId, selectedFileId, selectedFolderPath]);

  const initialExpandedFolderNodeIds = useMemo(
    () =>
      masterNodes
        .filter((node: MasterTreeNode) => node.type === 'folder')
        .map((node: MasterTreeNode) => node.id),
    [masterNodes],
  );

  const adapter = useMemo(
    () =>
      createCaseResolverMasterTreeAdapter({
        moveFile: onMoveFile,
        moveAsset: onMoveAsset,
        moveFolder: onMoveFolder,
        renameFile: onRenameFile,
        renameAsset: onRenameAsset,
        renameFolder: onRenameFolder,
      }),
    [
      onMoveAsset,
      onMoveFile,
      onMoveFolder,
      onRenameAsset,
      onRenameFile,
      onRenameFolder,
    ],
  );

  const {
    appearance: { resolveIcon, rootDropUi },
    controller,
  } = useMasterFolderTreeInstance({
    instance: 'case_resolver',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    initiallyExpandedNodeIds: initialExpandedFolderNodeIds,
    adapter,
  });

  const canStartTreeDrag = React.useCallback<
    NonNullable<MasterFolderTreeProps['canStartDrag']>
  >(({ node, event }): boolean => {
    if (node.type !== 'file') return true;
    const eventTarget = event.target;
    if (eventTarget instanceof Element) {
      const fromHandle =
        eventTarget.closest('[data-master-tree-drag-handle="true"]') !== null;
      if (fromHandle) {
        dragHandleNodeIdRef.current = node.id;
        return true;
      }
    }
    if (typeof document !== 'undefined') {
      const pointerElement = document.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      const fromPointerHandle =
        pointerElement?.closest('[data-master-tree-drag-handle="true"]') !==
        null;
      if (fromPointerHandle) {
        dragHandleNodeIdRef.current = node.id;
        return true;
      }
    }
    return dragHandleNodeIdRef.current === node.id;
  }, []);

  const selectedFolderForCreate = useMemo((): string | null => {
    if (!controller.selectedNodeId) return selectedFolderPath;
    const folderPath = fromCaseResolverFolderNodeId(controller.selectedNodeId);
    if (folderPath !== null) return folderPath;
    const selectedNode = controller.nodes.find(
      (node: MasterTreeNode) => node.id === controller.selectedNodeId,
    );
    if (!selectedNode?.parentId) return '';
    return fromCaseResolverFolderNodeId(selectedNode.parentId);
  }, [controller.nodes, controller.selectedNodeId, selectedFolderPath]);
  const selectedFolderForFolderCreate = selectedFolderPath;
  const createContextTooltip = useMemo((): string | null => {
    if (canCreateInActiveCase) return null;
    if (requestedCaseStatus === 'loading') return 'Loading case context...';
    if (requestedCaseStatus === 'missing')
      return 'Case context unavailable. Click to retry.';
    if (!activeCaseId) return 'Select a case first.';
    return 'Case context is not ready.';
  }, [activeCaseId, canCreateInActiveCase, requestedCaseStatus]);
  const disableCreateActions =
    !canCreateInActiveCase && requestedCaseStatus !== 'missing';
  const activeCaseFile = useMemo(() => {
    if (activeCaseId) {
      const explicitCase = workspace.files.find(
        (file: CaseResolverFile) => file.id === activeCaseId && file.fileType === 'case',
      );
      if (explicitCase) return explicitCase;
    }
    if (activeFile?.fileType === 'case') return activeFile;
    if (activeFile?.parentCaseId) {
      const parentCase = workspace.files.find(
        (file: CaseResolverFile) =>
          file.id === activeFile.parentCaseId && file.fileType === 'case',
      );
      if (parentCase) return parentCase;
    }
    return null;
  }, [activeCaseId, activeFile, workspace.files]);
  const activeCaseIdentifierLabel = useMemo((): string | null => {
    const identifierId = activeCaseFile?.caseIdentifierId ?? null;
    if (!identifierId) return null;
    const match = caseResolverIdentifiers.find(
      (identifier: CaseResolverIdentifier) => identifier.id === identifierId,
    );
    return match?.name ?? identifierId;
  }, [activeCaseFile?.caseIdentifierId, caseResolverIdentifiers]);

  const fileLockById = useMemo((): Map<string, boolean> => {
    return new Map(
      treeWorkspace.files.map((file: CaseResolverFile): [string, boolean] => [
        file.id,
        file.isLocked ?? false,
      ]),
    );
  }, [treeWorkspace.files]);

  const folderCaseFileStatsByPath = useMemo((): Map<
    string,
    FolderCaseFileStats
  > => {
    const stats = new Map<string, FolderCaseFileStats>();
    treeWorkspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType === 'case') return;
      const normalizedFolder = file.folder.trim();
      if (!normalizedFolder) return;
      const segments = normalizedFolder.split('/').filter(Boolean);
      for (let index = 0; index < segments.length; index += 1) {
        const path = segments.slice(0, index + 1).join('/');
        const current = stats.get(path) ?? { total: 0, locked: 0 };
        const next: FolderCaseFileStats = {
          total: current.total + 1,
          locked: current.locked + (file.isLocked ? 1 : 0),
        };
        stats.set(path, next);
      }
    });
    return stats;
  }, [treeWorkspace.files]);

  const nodeFileRelations = useMemo(() => {
    if (treeWorkspace.assets.length === 0) {
      return EMPTY_CASE_RESOLVER_NODE_FILE_RELATION_INDEX;
    }
    return buildCaseResolverNodeFileRelationIndexFromAssets({
      assets: treeWorkspace.assets,
      files: treeWorkspace.files,
    });
  }, [treeWorkspace.assets, treeWorkspace.files]);

  const documentNodeIdsBySourceFileId = useMemo((): Map<string, string[]> => {
    return new Map<string, string[]>(
      Object.entries(nodeFileRelations.nodeIdsByDocumentFileId),
    );
  }, [nodeFileRelations.nodeIdsByDocumentFileId]);

  const nodeFileAssetIdsBySourceFileId = useMemo((): Map<string, string[]> => {
    return new Map<string, string[]>(
      Object.entries(nodeFileRelations.nodeFileAssetIdsByDocumentFileId),
    );
  }, [nodeFileRelations.nodeFileAssetIdsByDocumentFileId]);

  useEffect(() => {
    if (!isNodeFileCanvasActive) return;
    const activeNodeFileAssetId = selectedAssetId?.trim() ?? '';
    const relatedNodeFileAssetIds = selectedFileId
      ? (nodeFileAssetIdsBySourceFileId.get(selectedFileId) ?? [])
      : [];
    const stableRelatedNodeFileAssetIds = Array.from(
      new Set<string>(relatedNodeFileAssetIds),
    ).sort((left: string, right: string): number => left.localeCompare(right));
    const nextHighlighted = [
      ...(activeNodeFileAssetId ? [activeNodeFileAssetId] : []),
      ...stableRelatedNodeFileAssetIds.filter(
        (assetId: string): boolean => assetId !== activeNodeFileAssetId,
      ),
    ];
    setHighlightedNodeFileAssetIds((currentHighlighted: string[]): string[] =>
      areStringArraysEqual(currentHighlighted, nextHighlighted)
        ? currentHighlighted
        : nextHighlighted,
    );
  }, [
    isNodeFileCanvasActive,
    nodeFileAssetIdsBySourceFileId,
    selectedAssetId,
    selectedFileId,
  ]);

  const highlightedNodeFileAssetIdSet = useMemo(
    () => new Set<string>(highlightedNodeFileAssetIds),
    [highlightedNodeFileAssetIds],
  );

  useEffect(() => {
    if (isNodeFileCanvasActive) return;
    if (highlightedNodeFileAssetIds.length === 0) return;
    setHighlightedNodeFileAssetIds([]);
  }, [highlightedNodeFileAssetIds.length, isNodeFileCanvasActive]);

  useEffect(() => {
    if (highlightedNodeFileAssetIds.length === 0) return;
    const validNodeFileAssetIds = new Set<string>(
      treeWorkspace.assets
        .filter((asset: CaseResolverAssetFile): boolean => asset.kind === 'node_file')
        .map((asset: CaseResolverAssetFile): string => asset.id),
    );
    const nextHighlighted = highlightedNodeFileAssetIds.filter(
      (assetId: string): boolean => validNodeFileAssetIds.has(assetId),
    );
    if (nextHighlighted.length === highlightedNodeFileAssetIds.length) return;
    setHighlightedNodeFileAssetIds(nextHighlighted);
  }, [highlightedNodeFileAssetIds, treeWorkspace.assets]);

  const highlightedFolderAncestorNodeIds = useMemo((): string[] => {
    if (highlightedNodeFileAssetIds.length === 0) return [];
    const highlighted = new Set<string>(highlightedNodeFileAssetIds);
    const ancestorNodeIds = new Set<string>();
    treeWorkspace.assets.forEach((asset: CaseResolverAssetFile): void => {
      if (asset.kind !== 'node_file') return;
      if (!highlighted.has(asset.id)) return;
      resolveFolderAncestorNodeIds(asset.folder).forEach(
        (folderNodeId: string): void => {
          ancestorNodeIds.add(folderNodeId);
        },
      );
    });
    return Array.from(ancestorNodeIds);
  }, [highlightedNodeFileAssetIds, treeWorkspace.assets]);

  useEffect(() => {
    if (highlightedFolderAncestorNodeIds.length === 0) return;
    const nextExpandedNodeIds = new Set<string>(
      Array.from(controller.expandedNodeIds).map((nodeId): string =>
        String(nodeId),
      ),
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
        setHighlightedNodeFileAssetIds(
          pendingNodeCanvasAction.relatedNodeFileAssetIds,
        );
        emitCaseResolverShowDocumentInCanvas({
          fileId: pendingNodeCanvasAction.fileId,
          nodeId: pendingNodeCanvasAction.nodeId ?? null,
          relatedNodeFileAssetIds:
            pendingNodeCanvasAction.relatedNodeFileAssetIds,
        });
      }
      setPendingNodeCanvasAction(null);
    }, 0);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [isNodeFileCanvasActive, pendingNodeCanvasAction, selectedAssetId]);

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
    () => ({
      FolderClosedIcon: resolveIcon({
        slot: 'folderClosed',
        kind: 'folder',
        fallback: Folder,
        fallbackId: 'Folder',
      }),
      FolderOpenIcon: resolveIcon({
        slot: 'folderOpen',
        kind: 'folder',
        fallback: FolderOpen,
        fallbackId: 'FolderOpen',
      }),
      DefaultFileIcon: resolveIcon({
        slot: 'file',
        kind: 'case_file',
        fallback: FileText,
        fallbackId: 'FileText',
      }),
      ScanCaseFileIcon: resolveIcon({
        slot: 'file',
        kind: 'case_file_scan',
        fallback: FileImage,
        fallbackId: 'FileImage',
      }),
      NodeFileIcon: resolveIcon({
        slot: 'file',
        kind: 'node_file',
        fallback: FileCode2,
        fallbackId: 'FileCode2',
      }),
      ImageFileIcon: resolveIcon({
        slot: 'file',
        kind: 'asset_image',
        fallback: FileImage,
        fallbackId: 'FileImage',
      }),
      PdfFileIcon: resolveIcon({
        slot: 'file',
        kind: 'asset_pdf',
        fallback: FileText,
        fallbackId: 'FileText',
      }),
      DragHandleIcon: resolveIcon({
        slot: 'dragHandle',
        fallback: GripVertical,
        fallbackId: 'GripVertical',
      }),
    }),
    [resolveIcon],
  );

  return (
    <FolderTreePanel
      className='border-border bg-gray-900'
      bodyClassName='flex min-h-0 flex-1 flex-col'
      header={
        <div className='space-y-2 border-b border-border/60 px-2 py-2'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <div className='truncate text-sm font-semibold text-gray-100'>
                {activeCaseFile?.name ?? 'Case Resolver'}
              </div>
              <div className='mt-0.5 text-xs text-muted-foreground/80'>
                {activeCaseIdentifierLabel
                  ? `Signature ID: ${activeCaseIdentifierLabel}`
                  : 'No signature ID'}
              </div>
            </div>
            <div className='flex shrink-0 items-start gap-1'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-gray-200 hover:bg-muted/50'
                onClick={(): void => {
                  router.push('/admin/case-resolver/cases');
                }}
              >
                ALL CASES
              </Button>
            </div>
          </div>
          {createContextTooltip ? (
            <div className='rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200'>
              {createContextTooltip}
            </div>
          ) : null}
          <div className='flex flex-wrap items-center gap-1'>
            <Button
              type='button'
              onClick={(): void => {
                onCreateFolder(selectedFolderForFolderCreate);
              }}
              size='sm'
              variant='outline'
              className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
              title={createContextTooltip ?? 'Add folder'}
              disabled={disableCreateActions}
            >
              <FolderPlus className='size-4' />
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                onCreateFile(selectedFolderForCreate);
              }}
              size='sm'
              variant='outline'
              className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
              title={createContextTooltip ?? 'Add case file'}
              disabled={disableCreateActions}
            >
              <FilePlus className='size-4' />
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                onCreateScanFile(selectedFolderForCreate);
              }}
              size='sm'
              variant='outline'
              className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
              title={createContextTooltip ?? 'Create new image file'}
              disabled={disableCreateActions}
            >
              <FileImage className='size-4' />
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                onCreateNodeFile(selectedFolderForCreate);
              }}
              size='sm'
              variant='outline'
              className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
              title={createContextTooltip ?? 'Add node file'}
              disabled={disableCreateActions}
            >
              <FileCode2 className='size-4' />
            </Button>
          </div>
        </div>
      }
    >
      <div className='min-h-0 flex-1 overflow-auto p-2'>
        <MasterFolderTree
          controller={controller}
          canStartDrag={canStartTreeDrag}
          rootDropUi={rootDropUi}
          canDrop={({
            draggedNodeId,
            targetId,
            position,
            defaultAllowed,
          }): boolean => {
            if (defaultAllowed) return true;
            const dragged = decodeCaseResolverMasterNodeId(draggedNodeId);
            if (!dragged) return false;
            if (dragged.entity !== 'file' && dragged.entity !== 'asset')
              return false;

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
              (candidate: MasterTreeNode): boolean => candidate.id === targetId,
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
            const edgePosition = resolveVerticalDropPosition(
              event.clientY,
              targetRect,
              {
                thresholdRatio: 0.34,
              },
            );
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
              { text: payload.name, effectAllowed: 'copyMove' },
            );
          }}
          onNodeDrop={async (
            { draggedNodeId, targetId, position, rootDropZone },
            ctlr,
          ): Promise<void> => {
            const isInternal = isInternalMasterTreeNode(
              ctlr.nodes,
              draggedNodeId,
            );
            if (!isInternal) return;

            // File-on-file center drop → link as related documents
            if (position === 'inside' && targetId !== null) {
              const draggedFileId = fromCaseResolverFileNodeId(draggedNodeId);
              const targetFileId = fromCaseResolverFileNodeId(targetId);
              if (draggedFileId && targetFileId) {
                onLinkRelatedFiles(draggedFileId, targetFileId);
                return;
              }
            }

            await applyInternalMasterTreeDrop({
              controller: ctlr,
              draggedNodeId,
              targetId,
              position,
              rootDropZone,
            });
          }}
          renderNode={({
            node,
            depth,
            hasChildren,
            isExpanded,
            isSelected,
            isRenaming,
            isDragging,
            isDropTarget,
            dropPosition,
            select,
            toggleExpand,
            startRename,
          }): React.JSX.Element => {
            const folderPath = fromCaseResolverFolderNodeId(node.id);
            const fileId = fromCaseResolverFileNodeId(node.id);
            const assetId = fromCaseResolverAssetNodeId(node.id);
            const fileType = parseString(node.metadata?.['fileType']);
            const isCaseFileKind = node.kind.startsWith('case_file');
            const isCaseFile =
              Boolean(fileId) &&
              (isCaseFileKind ||
                fileType === 'document' ||
                fileType === 'scanfile');
            const isScanCaseFile =
              Boolean(fileId) &&
              (node.kind === 'case_file_scan' || fileType === 'scanfile');
            const isCanvasCaseFile = Boolean(fileId) && isCaseFile;
            const isNodeFileAsset =
              Boolean(assetId) && node.kind === 'node_file';
            const linkedDocumentNodeIds = fileId
              ? (documentNodeIdsBySourceFileId.get(fileId) ?? [])
              : [];
            const linkedNodeFileAssetIds = fileId
              ? (nodeFileAssetIdsBySourceFileId.get(fileId) ?? [])
              : [];
            const hasDocumentNodeInCanvas = linkedDocumentNodeIds.length > 0;
            const isHighlightedNodeFile = Boolean(
              assetId && highlightedNodeFileAssetIdSet.has(assetId),
            );
            const isFileLocked = fileId
              ? fileLockById.get(fileId) === true
              : false;
            const isFolder = folderPath !== null;
            const folderStats = folderPath
              ? (folderCaseFileStatsByPath.get(folderPath) ?? null)
              : null;
            const folderHasCaseFiles = Boolean(
              folderStats && folderStats.total > 0,
            );
            const folderHasLockedFiles = Boolean(
              folderStats && folderStats.locked > 0,
            );
            const isFolderLocked = Boolean(
              folderStats &&
              folderStats.total > 0 &&
              folderStats.total === folderStats.locked,
            );
            const hoverOnlyControlClass = isSelected
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100';
            const canToggle = isFolder && hasChildren;
            const Icon = (() => {
              if (isFolder) {
                return canToggle && isExpanded
                  ? FolderOpenIcon
                  : FolderClosedIcon;
              }
              if (node.kind === 'node_file') {
                return NodeFileIcon;
              }
              if (node.kind === 'case_file_scan') {
                return ScanCaseFileIcon;
              }
              if (isCanvasCaseFile && !isScanCaseFile) {
                return DefaultFileIcon;
              }
              if (node.kind === 'asset_image') {
                return ImageFileIcon;
              }
              if (node.kind === 'asset_pdf') {
                return PdfFileIcon;
              }
              return DefaultFileIcon;
            })();

            const isLinkDropTarget = isDropTarget && dropPosition === 'inside' && fileId !== null;
            const stateClassName = isSelected
              ? 'bg-blue-600 text-white'
              : isHighlightedNodeFile
                ? 'bg-violet-500/15 text-violet-100 ring-1 ring-inset ring-violet-400/60'
                : isLinkDropTarget
                  ? 'bg-teal-500/20 text-teal-100 ring-2 ring-inset ring-teal-400/70'
                  : dropPosition === 'before'
                    ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-blue-500/60'
                    : dropPosition === 'after'
                      ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-cyan-400/60'
                      : isDragging
                        ? 'opacity-50 text-gray-200'
                        : isDropTarget
                          ? 'bg-cyan-500/10 text-cyan-100'
                          : 'text-gray-300 hover:bg-muted/50';

            return (
              <div
                className={`group flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-sm ${stateClassName}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                role='button'
                tabIndex={0}
                title={
                  isNodeFileAsset
                    ? 'Canvas file — click to open'
                    : isCanvasCaseFile
                      ? 'Drag file to canvas'
                      : node.name
                }
                onClick={(): void => {
                  if (!isSelected) {
                    select();
                  }
                  if (folderPath !== null) {
                    onSelectFolder(folderPath);
                    return;
                  }
                  if (fileId) {
                    if (isSelected && fileType !== 'case') {
                      onDeactivateActiveFile();
                      return;
                    }
                    onSelectFile(fileId, {
                      preserveSelectedAsset: isNodeFileCanvasActive,
                    });
                    return;
                  }
                  if (assetId) {
                    onSelectAsset(assetId);
                  }
                }}
                onDoubleClick={(): void => {
                  startRename();
                }}
                onKeyDown={(
                  event: React.KeyboardEvent<HTMLDivElement>,
                ): void => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!isSelected) {
                      select();
                    }
                    if (folderPath !== null) {
                      onSelectFolder(folderPath);
                      return;
                    }
                    if (fileId) {
                      if (isSelected && fileType !== 'case') {
                        onDeactivateActiveFile();
                        return;
                      }
                      onSelectFile(fileId, {
                        preserveSelectedAsset: isNodeFileCanvasActive,
                      });
                      return;
                    }
                    if (assetId) {
                      onSelectAsset(assetId);
                    }
                  }
                }}
              >
                <DragHandleIcon
                  data-master-tree-drag-handle='true'
                  onPointerDown={(): void => {
                    dragHandleNodeIdRef.current = node.id;
                  }}
                  onMouseDown={(): void => {
                    dragHandleNodeIdRef.current = node.id;
                  }}
                  className={`size-3 shrink-0 ${
                    isCanvasCaseFile
                      ? `cursor-grab text-sky-300/90 transition-opacity active:cursor-grabbing ${hoverOnlyControlClass}`
                      : isNodeFileAsset
                        ? `cursor-grab text-violet-400/80 transition-opacity active:cursor-grabbing ${hoverOnlyControlClass}`
                        : 'cursor-default text-gray-500'
                  }`}
                />
                {canToggle ? (
                  <button
                    type='button'
                    className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/50'
                    onClick={(event): void => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleExpand();
                    }}
                    aria-label={
                      isExpanded ? 'Collapse folder' : 'Expand folder'
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown className='size-3' />
                    ) : (
                      <ChevronRight className='size-3' />
                    )}
                  </button>
                ) : (
                  <span
                    className={`inline-flex size-4 items-center justify-center text-xs ${
                      isCaseFile && isFileLocked
                        ? 'text-amber-300 opacity-100'
                        : 'opacity-40'
                    }`}
                    title={
                      isCaseFile && isFileLocked
                        ? 'Document is locked'
                        : undefined
                    }
                  >
                    •
                  </span>
                )}
                <Icon className='size-4 shrink-0' />
                {isFolder && isFolderLocked ? (
                  <Lock
                    className='size-3.5 shrink-0 text-amber-300'
                    aria-hidden='true'
                  />
                ) : null}
                <div className='min-w-0 flex flex-1 items-center gap-1'>
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={controller.renameDraft}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                      ): void => {
                        controller.updateRenameDraft(event.target.value);
                      }}
                      onBlur={(): void => {
                        void controller.commitRename();
                      }}
                      onKeyDown={(
                        event: React.KeyboardEvent<HTMLInputElement>,
                      ): void => {
                        event.stopPropagation();
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void controller.commitRename();
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          controller.cancelRename();
                        }
                      }}
                      onClick={(
                        event: React.MouseEvent<HTMLInputElement>,
                      ): void => {
                        event.stopPropagation();
                      }}
                      onDoubleClick={(
                        event: React.MouseEvent<HTMLInputElement>,
                      ): void => {
                        event.stopPropagation();
                      }}
                      className='min-w-0 flex-1 rounded border border-blue-500 bg-gray-800 px-1.5 py-0.5 text-sm text-white outline-none'
                    />
                  ) : (
                    <>
                      <span className='min-w-0 flex-1 truncate'>
                        {node.name}
                      </span>
                      {isLinkDropTarget ? (
                        <span className='shrink-0 rounded bg-teal-500/30 px-1 text-[10px] font-medium text-teal-200'>
                          Link →
                        </span>
                      ) : null}
                      {isCaseFile && fileId ? (
                        <button
                          type='button'
                          className={`inline-flex size-4 shrink-0 items-center justify-center rounded text-gray-300/80 transition hover:bg-muted/60 hover:text-white ${
                            hoverOnlyControlClass
                          }`}
                          title={
                            isScanCaseFile ? 'Edit scan file' : 'Edit document'
                          }
                          aria-label={
                            isScanCaseFile ? 'Edit scan file' : 'Edit document'
                          }
                          onClick={(event): void => {
                            event.preventDefault();
                            event.stopPropagation();
                            onEditFile(fileId);
                          }}
                        >
                          <Pencil className='size-3' />
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
                {!isRenaming && isFolder && folderPath !== null ? (
                  <div
                    className={`flex shrink-0 items-center gap-1 transition ${
                      hoverOnlyControlClass
                    }`}
                  >
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-gray-300 transition hover:bg-muted/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                      title={
                        !folderHasCaseFiles
                          ? 'No case files in folder'
                          : isFolderLocked
                            ? 'Unlock folder files'
                            : 'Lock folder files'
                      }
                      aria-label={
                        !folderHasCaseFiles
                          ? 'No case files in folder'
                          : isFolderLocked
                            ? 'Unlock folder files'
                            : 'Lock folder files'
                      }
                      disabled={!folderHasCaseFiles}
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleFolderLock(folderPath);
                      }}
                    >
                      {isFolderLocked ? (
                        <Unlock className='size-3.5' />
                      ) : (
                        <Lock className='size-3.5' />
                      )}
                    </button>
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50'
                      title={
                        folderHasLockedFiles
                          ? 'Unlock folder files before removing'
                          : 'Remove folder'
                      }
                      aria-label='Remove folder'
                      disabled={folderHasLockedFiles}
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDeleteFolder(folderPath);
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </div>
                ) : null}
                {!isRenaming && isCaseFile && fileId ? (
                  <div
                    className={`flex shrink-0 items-center gap-1 transition ${
                      hoverOnlyControlClass
                    }`}
                  >
                    {isCanvasCaseFile ? (
                      <button
                        type='button'
                        className='inline-flex size-6 items-center justify-center rounded border border-sky-500/40 bg-sky-500/10 text-sky-200 transition hover:bg-sky-500/20 hover:text-sky-100'
                        title={
                          isNodeFileCanvasActive
                            ? 'Add file to node canvas'
                            : hasDocumentNodeInCanvas
                              ? 'Show file in node file canvas'
                              : 'Add file to a node file canvas'
                        }
                        aria-label={
                          isNodeFileCanvasActive
                            ? 'Add file to node canvas'
                            : hasDocumentNodeInCanvas
                              ? 'Show file in node file canvas'
                              : 'Add file to a node file canvas'
                        }
                        onClick={(event): void => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (
                            !isNodeFileCanvasActive &&
                            hasDocumentNodeInCanvas
                          ) {
                            const targetNodeFileAssetId =
                              linkedNodeFileAssetIds[0] ?? null;
                            if (targetNodeFileAssetId) {
                              onSelectAsset(targetNodeFileAssetId);
                            }
                            setPendingNodeCanvasAction({
                              kind: 'show',
                              fileId,
                              name: node.name,
                              folder: parseString(node.metadata?.['folder']),
                              nodeId:
                                linkedDocumentNodeIds[
                                  linkedDocumentNodeIds.length - 1
                                ] ?? null,
                              relatedNodeFileAssetIds: linkedNodeFileAssetIds,
                              targetNodeFileAssetId,
                            });
                            return;
                          }
                          if (!isNodeFileCanvasActive) {
                            onCreateNodeFile(
                              parseString(node.metadata?.['folder']),
                            );
                            setPendingNodeCanvasAction({
                              kind: 'drop',
                              fileId,
                              name: node.name,
                              folder: parseString(node.metadata?.['folder']),
                              relatedNodeFileAssetIds: [],
                            });
                            return;
                          }
                          setHighlightedNodeFileAssetIds([]);
                          emitCaseResolverDropDocumentToCanvas({
                            fileId,
                            name: node.name,
                            folder: parseString(node.metadata?.['folder']),
                          });
                        }}
                      >
                        {!isNodeFileCanvasActive && hasDocumentNodeInCanvas ? (
                          <Eye className='size-3.5' />
                        ) : (
                          <Sparkles className='size-3.5' />
                        )}
                      </button>
                    ) : null}
                    <button
                      type='button'
                      className={`inline-flex size-6 items-center justify-center rounded border transition ${
                        isFileLocked
                          ? 'border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 hover:text-amber-100'
                          : 'border-border/60 bg-card/60 text-gray-300 hover:bg-muted/60 hover:text-white'
                      }`}
                      title={isFileLocked ? 'Unlock file' : 'Lock file'}
                      aria-label={isFileLocked ? 'Unlock file' : 'Lock file'}
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleFileLock(fileId);
                      }}
                    >
                      {isFileLocked ? (
                        <Lock className='size-3.5' />
                      ) : (
                        <Unlock className='size-3.5' />
                      )}
                    </button>
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50'
                      title={
                        isFileLocked
                          ? 'Unlock file before removing'
                          : 'Remove file'
                      }
                      aria-label='Remove file'
                      disabled={isFileLocked}
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDeleteFile(fileId);
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </div>
                ) : null}
                {!isRenaming && isNodeFileAsset && assetId ? (
                  <div
                    className={`flex shrink-0 items-center gap-1 transition ${
                      hoverOnlyControlClass
                    }`}
                  >
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200'
                      title='Remove node file'
                      aria-label='Remove node file'
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDeleteAsset(assetId);
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      </div>
      <ConfirmationModal />
    </FolderTreePanel>
  );
}
