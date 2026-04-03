'use client';

import { ChevronDown, ChevronRight, Lock, Unlock, Trash2, GitBranch } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput as CaseResolverTreeNodeProps } from '@/shared/lib/foldertree/public';
import { Button, Badge, Input } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { focusOnMount } from '@/shared/utils/focus-on-mount';

import {
  useCaseResolverFolderTreeDataContext,
  useCaseResolverFolderTreeUiStateContext,
  isCaseResolverVirtualSectionNode,
  isUnassignedNode as isCaseResolverUnassignedNode,
} from '../context/CaseResolverFolderTreeContext';
import {
  fromCaseResolverFolderNodeId,
  fromCaseResolverFileNodeId,
  fromCaseResolverAssetNodeId,
} from '../master-tree';
import { parseString, isCaseResolverDraggableFileNode } from './CaseResolverFolderTree.helpers';
import { resolveCaseResolverTreeNodeClickAction } from './CaseResolverTreeNode.helpers';
import { useCaseResolverTreeNodeRuntimeContext } from './CaseResolverTreeNodeRuntimeContext';
import { useCaseResolverPageActions } from '../context/CaseResolverPageContext';

export type { CaseResolverTreeNodeProps };

export function CaseResolverTreeNode(props: CaseResolverTreeNodeProps): React.JSX.Element {
  const {
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
  } = props;

  const {
    armDragHandle,
    releaseDragHandle,
    renameDraft,
    onUpdateRenameDraft,
    onCommitRename,
    onCancelRename,
    FolderClosedIcon,
    FolderOpenIcon,
    DefaultFileIcon,
    ScanCaseFileIcon,
    NodeFileIcon,
    ImageFileIcon,
    PdfFileIcon,
    DragHandleIcon,
  } = useCaseResolverTreeNodeRuntimeContext();
  const {
    onSelectFile,
    onSelectAsset,
    onSelectFolder,
    onDeactivateActiveFile,
    onEditFile,
    onToggleFileLock,
    onDeleteFile,
    onDeleteAsset,
    onToggleFolderLock,
    onDeleteFolder,
  } = useCaseResolverPageActions();

  const {
    fileLockById,
    folderCaseFileStatsByPath,
    childCaseIdSet,
    caseNameById,
    folderOwnerCaseIdsByPath,
    fileOwnerCaseIdById,
    assetOwnerCaseIdById,
  } = useCaseResolverFolderTreeDataContext();
  const { highlightedNodeFileAssetIdSet } = useCaseResolverFolderTreeUiStateContext();

  const folderPath = fromCaseResolverFolderNodeId(node.id);
  const fileId = fromCaseResolverFileNodeId(node.id);
  const assetId = fromCaseResolverAssetNodeId(node.id);
  const fileType = parseString(node.metadata?.['fileType']);
  const nodeEntity = parseString(node.metadata?.['entity']);
  const isCaseFileKind = node.kind.startsWith('case_file');
  const isCaseEntryNode = node.kind === 'case_entry' || nodeEntity === 'case';
  const isCaseFile =
    Boolean(fileId) && (isCaseFileKind || fileType === 'document' || fileType === 'scanfile');
  const isScanCaseFile =
    Boolean(fileId) && (node.kind === 'case_file_scan' || fileType === 'scanfile');
  const isCanvasCaseFile = Boolean(fileId) && isCaseFile;
  const isNodeFileAsset = Boolean(assetId) && node.kind === 'node_file';
  const isVirtualSectionNode = isCaseResolverVirtualSectionNode(node);
  const isUnassignedSectionNode = isCaseResolverUnassignedNode(node);
  const isDraggableFileNode = isCaseResolverDraggableFileNode({
    nodeType: node.type,
    fileType,
    isVirtualSectionNode,
  });
  const isHighlightedNodeFile = Boolean(assetId && highlightedNodeFileAssetIdSet.has(assetId));
  const isFileLocked = fileId ? fileLockById.get(fileId) === true : false;
  const isFolder = folderPath !== null;
  const folderStats = folderPath ? (folderCaseFileStatsByPath.get(folderPath) ?? null) : null;
  const folderHasCaseFiles = Boolean(folderStats && folderStats.total > 0);
  const folderHasLockedFiles = Boolean(folderStats && folderStats.locked > 0);
  const isFolderLocked = Boolean(
    folderStats && folderStats.total > 0 && folderStats.total === folderStats.locked
  );

  const nodeOwnerCaseIds = (() => {
    if (isVirtualSectionNode) return [];
    if (folderPath !== null) {
      return folderOwnerCaseIdsByPath.get(folderPath) ?? [];
    }
    if (fileId) {
      const ownerCaseId = fileOwnerCaseIdById.get(fileId);
      return ownerCaseId ? [ownerCaseId] : [];
    }
    if (assetId) {
      const ownerCaseId = assetOwnerCaseIdById.get(assetId);
      return ownerCaseId ? [ownerCaseId] : [];
    }
    return [];
  })();

  const childOwnerCaseIds = nodeOwnerCaseIds.filter((caseId: string): boolean =>
    childCaseIdSet.has(caseId)
  );
  const childOwnerCaseNames = Array.from(
    new Set(childOwnerCaseIds.map((caseId: string): string => caseNameById.get(caseId) ?? caseId))
  );
  const isChildOwnedStructureNode = childOwnerCaseNames.length > 0;
  const childStructureHint =
    childOwnerCaseNames.length === 1
      ? `Child case structure: ${childOwnerCaseNames[0]}`
      : `Child case structure: ${childOwnerCaseNames.join(', ')}`;

  const hoverOnlyControlClass = isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';

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

  const isLinkDropTarget = isDropTarget && dropPosition === 'inside' && fileId !== null;
  const nodeTitle =
    isVirtualSectionNode
      ? isUnassignedSectionNode
        ? 'Unassigned ownership'
        : 'Children cases folder structure'
      : isNodeFileAsset
        ? 'Canvas file - click to open'
        : isCanvasCaseFile
          ? 'Drag file to canvas'
          : node.name;
  const stateClassName = isVirtualSectionNode
    ? isSelected
      ? 'bg-cyan-600/30 text-cyan-50 ring-1 ring-inset ring-cyan-400/70'
      : 'bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15'
    : isSelected
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

  const handleClick = (event?: React.MouseEvent<HTMLElement>): void => {
    const resolution = resolveCaseResolverTreeNodeClickAction({
      isCaseEntryNode,
      isSelected,
      isVirtualSectionNode,
      folderPath,
      fileId,
      fileType,
      assetId,
    });

    if (resolution.shouldSelectNode) {
      select(event);
    }

    switch (resolution.action.type) {
      case 'select_folder':
        onSelectFolder(resolution.action.folderPath);
        return;
      case 'deactivate_active_file':
        onDeactivateActiveFile();
        return;
      case 'edit_file':
        onEditFile(resolution.action.fileId);
        return;
      case 'select_file':
        onSelectFile(resolution.action.fileId);
        return;
      case 'select_asset':
        onSelectAsset(resolution.action.assetId);
        return;
      case 'noop':
      default:
        return;
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded px-2 py-1.5 text-sm',
        isCaseEntryNode ? 'cursor-default' : 'cursor-pointer',
        stateClassName
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <button
        type='button'
        data-master-tree-drag-handle='true'
        onPointerDown={(): void => {
          if (!isDraggableFileNode) return;
          armDragHandle(node.id);
        }}
        onPointerUp={releaseDragHandle}
        onPointerCancel={releaseDragHandle}
        onMouseDown={(): void => {
          if (!isDraggableFileNode) return;
          armDragHandle(node.id);
        }}
        onMouseUp={releaseDragHandle}
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.stopPropagation();
        }}
        aria-label={isDraggableFileNode ? 'Drag file node' : 'Drag unavailable'}
        tabIndex={isDraggableFileNode ? 0 : -1}
        className={`inline-flex size-5 shrink-0 items-center justify-center rounded ${
          isDraggableFileNode
            ? `cursor-grab border-0 bg-transparent p-0 active:cursor-grabbing ${hoverOnlyControlClass}`
            : 'cursor-default border-0 bg-transparent p-0'
        }`}
        title={isDraggableFileNode ? 'Drag file node' : 'Drag unavailable'}>
        <DragHandleIcon
          className={`size-3 ${
            isDraggableFileNode
              ? isNodeFileAsset
                ? 'text-violet-400/80'
                : 'text-sky-300/90'
              : 'text-gray-500'
          }`}
        />
      </button>
      {canToggle ? (
        <Button
          variant='ghost'
          size='sm'
          className='size-4 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            toggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          title={isExpanded ? 'Collapse folder' : 'Expand folder'}>
          {isExpanded ? <ChevronDown className='size-3' /> : <ChevronRight className='size-3' />}
        </Button>
      ) : (
        <span
          className={`inline-flex size-4 items-center justify-center text-xs ${
            isCaseFile && isFileLocked ? 'text-amber-300 opacity-100' : 'opacity-40'
          }`}
          title={isCaseFile && isFileLocked ? 'Document is locked' : undefined}
        >
          •
        </span>
      )}
      {isRenaming ? (
        <div className='min-w-0 flex flex-1 items-center gap-1'>
          <Icon className='size-4 shrink-0' />
          {isFolder && isFolderLocked && !isVirtualSectionNode ? (
            <Lock className='size-3.5 shrink-0 text-amber-300' aria-hidden='true' />
          ) : null}
          {isChildOwnedStructureNode ? (
            <Badge
              variant='outline'
              className='bg-cyan-500/5 text-cyan-200 border-cyan-500/20 size-4 p-0 flex items-center justify-center'
              title={childStructureHint}
            >
              <GitBranch className='size-3' />
            </Badge>
          ) : null}
          <div className='min-w-0 flex flex-1 items-center gap-1'>
            <Input
              ref={focusOnMount}
              value={renameDraft}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                onUpdateRenameDraft(event.target.value);
              }}
              onBlur={(): void => {
                onCommitRename();
              }}
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onCommitRename();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  onCancelRename();
                }
              }}
              onClick={(event: React.MouseEvent<HTMLInputElement>): void => {
                event.stopPropagation();
              }}
              onDoubleClick={(event: React.MouseEvent<HTMLInputElement>): void => {
                event.stopPropagation();
              }}
              className='h-7 min-w-0 flex-1 border-blue-500 bg-gray-800 text-sm text-white'
             aria-label='Input field' title='Input field'/>
          </div>
        </div>
      ) : (
        <button
          type='button'
          className='min-w-0 flex flex-1 items-center gap-1 text-left'
          aria-current={isSelected ? 'true' : undefined}
          aria-label={nodeTitle}
          title={nodeTitle}
          onClick={handleClick}
          onDoubleClick={(): void => {
            if (isVirtualSectionNode) return;
            startRename();
          }}
        >
          <Icon className='size-4 shrink-0' />
          {isFolder && isFolderLocked && !isVirtualSectionNode ? (
            <Lock className='size-3.5 shrink-0 text-amber-300' aria-hidden='true' />
          ) : null}
          {isChildOwnedStructureNode ? (
            <Badge
              variant='outline'
              className='bg-cyan-500/5 text-cyan-200 border-cyan-500/20 size-4 p-0 flex items-center justify-center'
              title={childStructureHint}
            >
              <GitBranch className='size-3' />
            </Badge>
          ) : null}
          <div className='min-w-0 flex flex-1 items-center gap-1'>
            <span className='min-w-0 flex-1 truncate'>{node.name}</span>
            {isChildOwnedStructureNode ? (
              <Badge
                variant='outline'
                className='bg-cyan-500/5 text-cyan-200 border-cyan-500/20 text-[10px] h-4 max-w-[140px] truncate'
                title={childStructureHint}
              >
                {childOwnerCaseNames.length === 1
                  ? childOwnerCaseNames[0]
                  : `${childOwnerCaseNames.length} child cases`}
              </Badge>
            ) : null}
            {isLinkDropTarget ? (
              <Badge variant='neutral' className='bg-teal-500/30 text-teal-200 text-[9px] h-4'>
                Link →
              </Badge>
            ) : null}
          </div>
        </button>
      )}

      {!isRenaming && isFolder && folderPath !== null && !isVirtualSectionNode ? (
        <div className={`flex shrink-0 items-center gap-1 transition ${hoverOnlyControlClass}`}>
          <Button
            variant='outline'
            size='sm'
            className='size-6 p-0 border-border/60 bg-card/60 text-gray-300 hover:bg-white/10 hover:text-white'
            title={
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
            aria-label={!folderHasCaseFiles
                ? 'No case files in folder'
                : isFolderLocked
                  ? 'Unlock folder files'
                  : 'Lock folder files'}>
            {isFolderLocked ? <Unlock className='size-3.5' /> : <Lock className='size-3.5' />}
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='size-6 p-0 border-border/60 bg-card/60 text-red-300 hover:bg-red-500/20 hover:text-red-200'
            title={folderHasLockedFiles ? 'Unlock folder files before removing' : 'Remove folder'}
            disabled={folderHasLockedFiles}
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              onDeleteFolder(folderPath);
            }}
            aria-label={folderHasLockedFiles ? 'Unlock folder files before removing' : 'Remove folder'}>
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ) : null}

      {!isRenaming && isCaseFile && fileId ? (
        <div className={`flex shrink-0 items-center gap-1 transition ${hoverOnlyControlClass}`}>
          <Button
            variant='outline'
            size='sm'
            className={cn(
              'size-6 p-0 transition',
              isFileLocked
                ? 'border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 hover:text-amber-100'
                : 'border-border/60 bg-card/60 text-gray-300 hover:bg-white/10 hover:text-white'
            )}
            title={isFileLocked ? 'Unlock file' : 'Lock file'}
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFileLock(fileId);
            }}
            aria-label={isFileLocked ? 'Unlock file' : 'Lock file'}>
            {isFileLocked ? <Lock className='size-3.5' /> : <Unlock className='size-3.5' />}
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='size-6 p-0 border-border/60 bg-card/60 text-red-300 hover:bg-red-500/20 hover:text-red-200'
            title={isFileLocked ? 'Unlock file before removing' : 'Remove file'}
            disabled={isFileLocked}
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              onDeleteFile(fileId);
            }}
            aria-label={isFileLocked ? 'Unlock file before removing' : 'Remove file'}>
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ) : null}

      {!isRenaming && isNodeFileAsset && assetId ? (
        <div className={`flex shrink-0 items-center gap-1 transition ${hoverOnlyControlClass}`}>
          <Button
            variant='outline'
            size='sm'
            className='size-6 p-0 border-border/60 bg-card/60 text-red-300 hover:bg-red-500/20 hover:text-red-200'
            title='Remove node file'
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              onDeleteAsset(assetId);
            }}
            aria-label={'Remove node file'}>
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
