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
  Save,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import type { NodeDefinition } from '@/features/ai/ai-paths/lib';
import {
  applyInternalMasterTreeDrop,
  isInternalMasterTreeNode,
  MasterFolderTree,
  type MasterFolderTreeProps,
  useMasterFolderTreeInstance,
} from '@/features/foldertree';
import { Button, FolderTreePanel, TreeHeader, useToast } from '@/shared/ui';
import { DRAG_KEYS, resolveVerticalDropPosition, setDragData } from '@/shared/utils/drag-drop';
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
import { resolveCaseResolverTreeWorkspace } from './case-resolver-tree-workspace';
import {
  CASE_RESOLVER_PALETTE,
  parseNullableNumber,
  parseNullableString,
  parseString,
  resolveAssetKind,
  type FolderCaseFileStats,
  type PaletteEntry,
} from './CaseResolverFolderTree.helpers';

import type { CaseResolverWorkspace } from '../types';

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
    isWorkspaceDirty,
    isWorkspaceSaving,
    panelCollapsed,
    onPanelCollapsedChange,
    onSaveWorkspace,
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
    onToggleFileLock,
    onEditFile,
    activeFile,
  } = useCaseResolverPageContext();
  const { toast } = useToast();
  const [isRootExplicitlySelected, setIsRootExplicitlySelected] = useState(true);
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
      resolveCaseResolverTreeWorkspace({ selectedFileId, requestedFileId, workspace }),
    [requestedFileId, selectedFileId, workspace]
  );

  const masterNodes = useMemo(
    (): MasterTreeNode[] => buildMasterNodesFromCaseResolverWorkspace(treeWorkspace),
    [treeWorkspace]
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
    [masterNodes]
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
    [onMoveAsset, onMoveFile, onMoveFolder, onRenameAsset, onRenameFile, onRenameFolder]
  );

  const {
    appearance: { resolveIcon, rootDropUi },
    controller,
    panelCollapsed: persistedCollapsed,
    setPanelCollapsed,
  } = useMasterFolderTreeInstance({
    instance: 'case_resolver',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    initiallyExpandedNodeIds: initialExpandedFolderNodeIds,
    adapter,
  });

  useEffect(() => {
    if (persistedCollapsed !== panelCollapsed) {
      onPanelCollapsedChange(persistedCollapsed);
    }
  }, [onPanelCollapsedChange, panelCollapsed, persistedCollapsed]);

  useEffect(() => {
    if (panelCollapsed !== persistedCollapsed) {
      setPanelCollapsed(panelCollapsed);
    }
  }, [panelCollapsed, persistedCollapsed, setPanelCollapsed]);

  const canStartTreeDrag = React.useCallback<NonNullable<MasterFolderTreeProps['canStartDrag']>>(
    ({ node, event }): boolean => {
      if (node.type !== 'file') return true;
      const eventTarget = event.target;
      if (eventTarget instanceof Element) {
        const fromHandle = eventTarget.closest('[data-master-tree-drag-handle="true"]') !== null;
        if (fromHandle) {
          dragHandleNodeIdRef.current = node.id;
          return true;
        }
      }
      if (typeof document !== 'undefined') {
        const pointerElement = document.elementFromPoint(event.clientX, event.clientY);
        const fromPointerHandle =
          pointerElement?.closest('[data-master-tree-drag-handle="true"]') !== null;
        if (fromPointerHandle) {
          dragHandleNodeIdRef.current = node.id;
          return true;
        }
      }
      return dragHandleNodeIdRef.current === node.id;
    },
    []
  );

  useEffect(() => {
    if (selectedFileId || selectedAssetId || selectedFolderPath !== null) {
      setIsRootExplicitlySelected(false);
    }
  }, [selectedAssetId, selectedFileId, selectedFolderPath]);

  const selectedFolderForCreate = useMemo((): string | null => {
    if (!controller.selectedNodeId) return selectedFolderPath;
    const folderPath = fromCaseResolverFolderNodeId(controller.selectedNodeId);
    if (folderPath !== null) return folderPath;
    const selectedNode = controller.nodes.find(
      (node: MasterTreeNode) => node.id === controller.selectedNodeId
    );
    if (!selectedNode?.parentId) return '';
    return fromCaseResolverFolderNodeId(selectedNode.parentId);
  }, [controller.nodes, controller.selectedNodeId, selectedFolderPath]);
  const selectedFolderForFolderCreate = selectedFolderPath;
  const createContextTooltip = useMemo((): string | null => {
    if (canCreateInActiveCase) return null;
    if (requestedCaseStatus === 'loading') return 'Loading case context...';
    if (requestedCaseStatus === 'missing') return 'Case context unavailable. Click to retry.';
    if (!activeCaseId) return 'Select a case first.';
    return 'Case context is not ready.';
  }, [activeCaseId, canCreateInActiveCase, requestedCaseStatus]);
  const disableCreateActions = !canCreateInActiveCase && requestedCaseStatus !== 'missing';

  const fileLockById = useMemo((): Map<string, boolean> => {
    return new Map(
      treeWorkspace.files.map((file): [string, boolean] => [file.id, file.isLocked])
    );
  }, [treeWorkspace.files]);

  const folderCaseFileStatsByPath = useMemo((): Map<string, FolderCaseFileStats> => {
    const stats = new Map<string, FolderCaseFileStats>();
    treeWorkspace.files.forEach((file): void => {
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

  const documentNodeIdsBySourceFileId = useMemo((): Map<string, string[]> => {
    const byFileId = new Map<string, string[]>();
    if (activeFile?.fileType !== 'document') return byFileId;
    const activeNodeIds = new Set(activeFile.graph.nodes.map((node: { id: string }) => node.id));
    const sourceByNode = activeFile.graph.documentSourceFileIdByNode ?? {};
    Object.entries(sourceByNode).forEach(([nodeId, sourceFileId]: [string, string]) => {
      if (!activeNodeIds.has(nodeId)) return;
      const normalizedFileId = sourceFileId.trim();
      if (!normalizedFileId) return;
      const current = byFileId.get(normalizedFileId) ?? [];
      current.push(nodeId);
      byFileId.set(normalizedFileId, current);
    });
    return byFileId;
  }, [activeFile]);

  const {
    RootIcon,
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
      RootIcon: resolveIcon({ slot: 'root', fallback: Folder, fallbackId: 'Folder' }),
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
    [resolveIcon]
  );

  const handleNodePaletteDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    definition: NodeDefinition | null
  ): void => {
    if (!definition) return;
    setDragData(
      event.dataTransfer,
      { [DRAG_KEYS.AI_NODE]: JSON.stringify(definition) },
      {
        text: definition.title,
        effectAllowed: 'copy',
      }
    );
  };

  return (
    <FolderTreePanel
      className='border-border bg-gray-900'
      bodyClassName='flex min-h-0 flex-1 flex-col'
      masterInstance='case_resolver'
      header={(
        <TreeHeader
          actions={(
            <>
              <Button
                type='button'
                onClick={onSaveWorkspace}
                size='sm'
                variant={isWorkspaceDirty ? 'default' : 'outline'}
                className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
                title={
                  isWorkspaceSaving
                    ? 'Saving Case Resolver changes...'
                    : isWorkspaceDirty
                      ? 'Save Case Resolver changes (Ctrl/Cmd+S)'
                      : 'All Case Resolver changes saved'
                }
                disabled={isWorkspaceSaving || !isWorkspaceDirty}
              >
                <Save className='size-4' />
              </Button>
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
            </>
          )}
        >
          <Button
            type='button'
            onClick={(): void => {
              if (isWorkspaceDirty) {
                const shouldLeave = window.confirm(
                  'You have unsaved Case Resolver changes. Leave without saving?'
                );
                if (!shouldLeave) return;
              }
              router.push('/admin/case-resolver/cases');
            }}
            className={`w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
              !selectedFileId && !selectedAssetId && selectedFolderPath === null && isRootExplicitlySelected
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-muted/50'
            }`}
          >
            <RootIcon className='size-4' />
            <span>All Cases</span>
          </Button>
          {createContextTooltip ? (
            <div className='mt-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200'>
              {createContextTooltip}
            </div>
          ) : null}
        </TreeHeader>
      )}
    >
      <div className='border-b border-border/60 p-2'>
        <div className='mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400'>
          Node Palette
        </div>
        <div className='space-y-2'>
          {CASE_RESOLVER_PALETTE.map((entry: PaletteEntry) => (
            <div
              key={entry.id}
              draggable={Boolean(entry.definition)}
              onDragStart={(event): void => {
                handleNodePaletteDragStart(event, entry.definition);
              }}
              className={`rounded border bg-card/35 px-3 py-2 text-xs transition ${
                entry.definition
                  ? `cursor-grab active:cursor-grabbing ${entry.toneClassName}`
                  : 'border-border/60 text-gray-500'
              }`}
            >
              <div className='flex items-center gap-2'>
                <entry.Icon className='size-3.5' />
                <div className='font-semibold'>{entry.label}</div>
              </div>
              <div className='mt-1 text-[11px] text-gray-400'>{entry.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-auto p-2'>
        <MasterFolderTree
          controller={controller}
          canStartDrag={canStartTreeDrag}
          rootDropUi={rootDropUi}
          canDrop={(
            { draggedNodeId, targetId, position, defaultAllowed }
          ): boolean => {
            if (defaultAllowed) return true;
            const dragged = decodeCaseResolverMasterNodeId(draggedNodeId);
            if (!dragged) return false;
            if (dragged.entity !== 'file' && dragged.entity !== 'asset') return false;

            if (position === 'inside') {
              if (targetId === null) return true;
              return fromCaseResolverFolderNodeId(targetId) !== null;
            }

            return targetId !== null;
          }}
          resolveDropPosition={(event, { targetId }, ctlr) => {
            const targetNode = ctlr.nodes.find(
              (candidate: MasterTreeNode): boolean => candidate.id === targetId
            );
            if (targetNode?.type === 'folder') {
              return 'inside';
            }
            const targetRect = event.currentTarget.getBoundingClientRect();
            const edgePosition = resolveVerticalDropPosition(event.clientY, targetRect, {
              thresholdRatio: 0.34,
            });
            if (edgePosition === 'before' || edgePosition === 'after') {
              return edgePosition;
            }
            return 'after';
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
            const isInternal = isInternalMasterTreeNode(ctlr.nodes, draggedNodeId);
            if (!isInternal) return;
            await applyInternalMasterTreeDrop({
              controller: ctlr,
              draggedNodeId,
              targetId,
              position,
              rootDropZone,
            });
          }}
          renderNode={(
            {
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
            }
          ): React.JSX.Element => {
            const folderPath = fromCaseResolverFolderNodeId(node.id);
            const fileId = fromCaseResolverFileNodeId(node.id);
            const assetId = fromCaseResolverAssetNodeId(node.id);
            const fileType = parseString(node.metadata?.['fileType']);
            const isCaseFileKind = node.kind.startsWith('case_file');
            const isCaseFile =
              Boolean(fileId) &&
              (isCaseFileKind || fileType === 'document' || fileType === 'scanfile');
            const isScanCaseFile =
              Boolean(fileId) && (node.kind === 'case_file_scan' || fileType === 'scanfile');
            const isCanvasCaseFile = Boolean(fileId) && isCaseFile;
            const linkedDocumentNodeIds = fileId
              ? documentNodeIdsBySourceFileId.get(fileId) ?? []
              : [];
            const hasDocumentNodeInCanvas = linkedDocumentNodeIds.length > 0;
            const isFileLocked = fileId ? fileLockById.get(fileId) === true : false;
            const isFolder = folderPath !== null;
            const folderStats = folderPath ? folderCaseFileStatsByPath.get(folderPath) ?? null : null;
            const folderHasCaseFiles = Boolean(folderStats && folderStats.total > 0);
            const folderHasLockedFiles = Boolean(folderStats && folderStats.locked > 0);
            const isFolderLocked = Boolean(
              folderStats &&
              folderStats.total > 0 &&
              folderStats.total === folderStats.locked
            );
            const canToggle = isFolder && hasChildren;
            const Icon = (() => {
              if (isFolder) {
                return canToggle && isExpanded ? FolderOpenIcon : FolderClosedIcon;
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

            const stateClassName = isSelected
              ? 'bg-blue-600 text-white'
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
                className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm ${stateClassName} ${
                  isCanvasCaseFile ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                role='button'
                tabIndex={0}
                title={isCanvasCaseFile ? 'Drag file to canvas' : node.name}
                onClick={(): void => {
                  setIsRootExplicitlySelected(false);
                  if (!isSelected) {
                    select();
                  }
                  if (folderPath !== null) {
                    onSelectFolder(folderPath);
                    return;
                  }
                  if (fileId) {
                    if (isSelected) return;
                    onSelectFile(fileId);
                    return;
                  }
                  if (assetId) {
                    onSelectAsset(assetId);
                  }
                }}
                onDoubleClick={(): void => {
                  startRename();
                }}
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setIsRootExplicitlySelected(false);
                    if (!isSelected) {
                      select();
                    }
                    if (folderPath !== null) {
                      onSelectFolder(folderPath);
                      return;
                    }
                    if (fileId) {
                      if (isSelected) return;
                      onSelectFile(fileId);
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
                      ? 'text-sky-300/90 opacity-0 transition-opacity group-hover:opacity-100'
                      : 'text-gray-500'
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
                    aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                  >
                    {isExpanded ? (
                      <ChevronDown className='size-3' />
                    ) : (
                      <ChevronRight className='size-3' />
                    )}
                  </button>
                ) : (
                  <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
                )}
                <Icon className='size-4 shrink-0' />
                {isFolder && isFolderLocked ? (
                  <Lock className='size-3.5 shrink-0 text-amber-300' aria-hidden='true' />
                ) : null}
                {isCaseFile && isFileLocked ? (
                  <Lock className='size-3.5 shrink-0 text-amber-300' aria-hidden='true' />
                ) : null}
                <div className='min-w-0 flex flex-1 items-center gap-1'>
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={controller.renameDraft}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        controller.updateRenameDraft(event.target.value);
                      }}
                      onBlur={(): void => {
                        void controller.commitRename();
                      }}
                      onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                          void controller.commitRename();
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          controller.cancelRename();
                        }
                      }}
                      onClick={(event: React.MouseEvent<HTMLInputElement>): void => {
                        event.stopPropagation();
                      }}
                      onDoubleClick={(event: React.MouseEvent<HTMLInputElement>): void => {
                        event.stopPropagation();
                      }}
                      className='min-w-0 flex-1 rounded border border-blue-500 bg-gray-800 px-1.5 py-0.5 text-sm text-white outline-none'
                    />
                  ) : (
                    <>
                      <span className='min-w-0 flex-1 truncate'>{node.name}</span>
                      {isCaseFile && fileId ? (
                        <button
                          type='button'
                          className={`inline-flex size-4 shrink-0 items-center justify-center rounded text-gray-300/80 transition hover:bg-muted/60 hover:text-white ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title={isScanCaseFile ? 'Edit scan file' : 'Edit document'}
                          aria-label={isScanCaseFile ? 'Edit scan file' : 'Edit document'}
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
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
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
                      title={folderHasLockedFiles ? 'Unlock folder files before removing' : 'Remove folder'}
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
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isCanvasCaseFile ? (
                      <button
                        type='button'
                        className='inline-flex size-6 items-center justify-center rounded border border-sky-500/40 bg-sky-500/10 text-sky-200 transition hover:bg-sky-500/20 hover:text-sky-100'
                        title={hasDocumentNodeInCanvas ? 'Show file in canvas' : 'Drop file onto canvas'}
                        aria-label={hasDocumentNodeInCanvas ? 'Show file in canvas' : 'Drop file onto canvas'}
                        onClick={(event): void => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (activeFile?.fileType === 'case') {
                            toast('Open a non-case file to manage canvas text nodes.', {
                              variant: 'warning',
                            });
                            return;
                          }
                          if (hasDocumentNodeInCanvas) {
                            emitCaseResolverShowDocumentInCanvas({
                              fileId,
                              nodeId: linkedDocumentNodeIds[linkedDocumentNodeIds.length - 1] ?? null,
                            });
                            return;
                          }
                          emitCaseResolverDropDocumentToCanvas({
                            fileId,
                            name: node.name,
                            folder: parseString(node.metadata?.['folder']),
                          });
                        }}
                      >
                        {hasDocumentNodeInCanvas ? (
                          <Eye className='size-3.5' />
                        ) : (
                          <Sparkles className='size-3.5' />
                        )}
                      </button>
                    ) : null}
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-gray-300 transition hover:bg-muted/60 hover:text-white'
                      title={isFileLocked ? 'Unlock file' : 'Lock file'}
                      aria-label={isFileLocked ? 'Unlock file' : 'Lock file'}
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleFileLock(fileId);
                      }}
                    >
                      {isFileLocked ? (
                        <Unlock className='size-3.5' />
                      ) : (
                        <Lock className='size-3.5' />
                      )}
                    </button>
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50'
                      title={isFileLocked ? 'Unlock file before removing' : 'Remove file'}
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
              </div>
            );
          }}
        />
      </div>
    </FolderTreePanel>
  );
}
