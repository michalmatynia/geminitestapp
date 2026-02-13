'use client';

import {
  Brain,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileImage,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Lock,
  Pencil,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { palette, type NodeDefinition } from '@/features/ai/ai-paths/lib';
import {
  applyInternalMasterTreeDrop,
  isInternalMasterTreeNode,
  MasterFolderTree,
  useMasterFolderTreeInstance,
} from '@/features/foldertree';
import { Button, FolderTreePanel, TreeHeader, useToast } from '@/shared/ui';
import { DRAG_KEYS, resolveVerticalDropPosition, setDragData } from '@/shared/utils/drag-drop';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { createCaseResolverMasterTreeAdapter } from '../adapter';
import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
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

import type { CaseResolverTreeDragPayload } from '../drag';

type PaletteEntry = {
  id: string;
  label: string;
  description: string;
  definition: NodeDefinition | null;
  toneClassName: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const resolveAssetKind = (kind: unknown): 'node_file' | 'image' | 'pdf' | 'file' => {
  if (kind === 'node_file' || kind === 'image' || kind === 'pdf' || kind === 'file') {
    return kind;
  }
  return 'file';
};

const parseString = (value: unknown): string => (typeof value === 'string' ? value : '');
const parseNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;
const parseNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const promptDefinition = palette.find((entry: NodeDefinition) => entry.type === 'prompt') ?? null;
const modelDefinition = palette.find((entry: NodeDefinition) => entry.type === 'model') ?? null;

const CASE_RESOLVER_PALETTE: PaletteEntry[] = [
  {
    id: 'prompt',
    label: 'Prompt Node',
    description: 'Functional runtime prompt node.',
    definition: promptDefinition,
    toneClassName: 'border-violet-500/40 text-violet-100 hover:bg-violet-500/12',
    Icon: Sparkles,
  },
  {
    id: 'model',
    label: 'AI Model Node',
    description: 'Functional model execution node.',
    definition: modelDefinition,
    toneClassName: 'border-cyan-500/40 text-cyan-100 hover:bg-cyan-500/12',
    Icon: Brain,
  },
];

export function CaseResolverFolderTree(): React.JSX.Element {
  const {
    workspace,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    panelCollapsed,
    onPanelCollapsedChange,
    onSelectFile,
    onSelectAsset,
    onSelectFolder,
    onCreateFolder,
    onCreateFile,
    onCreateNodeFile,
    onUploadAssets,
    onMoveFile,
    onMoveAsset,
    onMoveFolder,
    onRenameFile,
    onRenameAsset,
    onRenameFolder,
    onDeleteFile,
    onToggleFileLock,
    onEditFile,
  } = useCaseResolverPageContext();
  const { toast } = useToast();
  const [isUploadingAssets, setIsUploadingAssets] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const masterNodes = useMemo(
    (): MasterTreeNode[] => buildMasterNodesFromCaseResolverWorkspace(workspace),
    [workspace]
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

  const fileLockById = useMemo((): Map<string, boolean> => {
    return new Map(
      workspace.files.map((file): [string, boolean] => [file.id, file.isLocked])
    );
  }, [workspace.files]);

  const {
    RootIcon,
    FolderClosedIcon,
    FolderOpenIcon,
    DefaultFileIcon,
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

  const triggerAssetUpload = (): void => {
    uploadInputRef.current?.click();
  };

  const handleUploadInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setIsUploadingAssets(true);
    try {
      await onUploadAssets(files, selectedFolderForCreate);
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to upload files.',
        { variant: 'error' }
      );
    } finally {
      setIsUploadingAssets(false);
    }
  };

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
                onClick={(): void => {
                  onCreateFolder(selectedFolderForCreate);
                }}
                size='sm'
                variant='outline'
                className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
                title='Add folder'
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
                title='Add case file'
              >
                <FilePlus className='size-4' />
              </Button>
              <Button
                type='button'
                onClick={(): void => {
                  onCreateNodeFile(selectedFolderForCreate);
                }}
                size='sm'
                variant='outline'
                className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
                title='Add node file'
              >
                <FileCode2 className='size-4' />
              </Button>
              <Button
                type='button'
                onClick={triggerAssetUpload}
                size='sm'
                variant='outline'
                disabled={isUploadingAssets}
                className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50 disabled:opacity-60'
                title='Upload files'
              >
                <Upload className='size-4' />
              </Button>
              <Button
                type='button'
                onClick={(): void => {
                  onPanelCollapsedChange(true);
                  setPanelCollapsed(true);
                }}
                size='sm'
                variant='outline'
                className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
                title='Collapse tree'
              >
                <ChevronRight className='size-4' />
              </Button>
            </>
          )}
        >
          <Button
            type='button'
            onClick={(): void => {
              onSelectFolder(null);
              controller.selectNode(null);
            }}
            className={`w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
              !selectedFileId && !selectedAssetId && selectedFolderPath === null
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-muted/50'
            }`}
          >
            <RootIcon className='size-4' />
            <span>All Cases</span>
          </Button>
        </TreeHeader>
      )}
    >
      <input
        ref={uploadInputRef}
        type='file'
        multiple
        className='hidden'
        onChange={(event): void => {
          void handleUploadInputChange(event);
        }}
      />

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
            const isCaseFile = Boolean(fileId) && node.kind === 'case_file';
            const isFileLocked = fileId ? fileLockById.get(fileId) === true : false;
            const isFolder = folderPath !== null;
            const canToggle = isFolder && hasChildren;
            const Icon = isFolder
              ? isExpanded
                ? FolderOpenIcon
                : FolderClosedIcon
              : node.kind === 'node_file'
                ? NodeFileIcon
                : node.kind === 'asset_image'
                  ? ImageFileIcon
                  : node.kind === 'asset_pdf'
                    ? PdfFileIcon
                    : DefaultFileIcon;

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
                className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm ${stateClassName}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                role='button'
                tabIndex={0}
                onClick={(): void => {
                  if (!isSelected) {
                    select();
                  }
                  if (folderPath !== null) {
                    onSelectFolder(folderPath);
                    return;
                  }
                  if (fileId) {
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
                    if (!isSelected) {
                      select();
                    }
                    if (folderPath !== null) {
                      onSelectFolder(folderPath);
                      return;
                    }
                    if (fileId) {
                      onSelectFile(fileId);
                      return;
                    }
                    if (assetId) {
                      onSelectAsset(assetId);
                    }
                  }
                }}
              >
                <DragHandleIcon className='size-3 shrink-0 text-gray-500' />
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
                {isCaseFile && isFileLocked ? (
                  <Lock className='size-3.5 shrink-0 text-amber-300' aria-hidden='true' />
                ) : null}
                <span className='min-w-0 flex-1 truncate'>{node.name}</span>
                {isCaseFile && fileId ? (
                  <div className='flex shrink-0 items-center gap-1'>
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-gray-300 transition hover:bg-muted/60 hover:text-white'
                      title='Edit document'
                      aria-label='Edit document'
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onEditFile(fileId);
                      }}
                    >
                      <Pencil className='size-3.5' />
                    </button>
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
