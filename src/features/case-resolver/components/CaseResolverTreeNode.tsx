'use client';

import React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Lock, 
  Unlock, 
  Trash2, 
  GitBranch 
} from 'lucide-react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import { 
  useCaseResolverFolderTreeContext,
  isChildCaseStructureNode 
} from '../context/CaseResolverFolderTreeContext';
import { 
  fromCaseResolverFolderNodeId,
  fromCaseResolverFileNodeId,
  fromCaseResolverAssetNodeId,
} from '../master-tree';
import { 
  parseString,
  isCaseResolverDraggableFileNode
} from './CaseResolverFolderTree.helpers';

export type CaseResolverTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  armDragHandle: (nodeId: string) => void;
  releaseDragHandle: () => void;
  renameDraft: string;
  onUpdateRenameDraft: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  FolderClosedIcon: React.ComponentType<{ className?: string }>;
  FolderOpenIcon: React.ComponentType<{ className?: string }>;
  DefaultFileIcon: React.ComponentType<{ className?: string }>;
  ScanCaseFileIcon: React.ComponentType<{ className?: string }>;
  NodeFileIcon: React.ComponentType<{ className?: string }>;
  ImageFileIcon: React.ComponentType<{ className?: string }>;
  PdfFileIcon: React.ComponentType<{ className?: string }>;
  DragHandleIcon: React.ComponentType<{ className?: string }>;
};

export function CaseResolverTreeNode({
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
}: CaseResolverTreeNodeProps): React.JSX.Element {
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
  } = useCaseResolverPageContext();

  const {
    highlightedNodeFileAssetIdSet,
    fileLockById,
    folderCaseFileStatsByPath,
    childCaseIdSet,
    caseNameById,
    folderOwnerCaseIdsByPath,
    fileOwnerCaseIdById,
    assetOwnerCaseIdById,
  } = useCaseResolverFolderTreeContext();

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
  const isChildStructureSectionNode = isChildCaseStructureNode(node);
  const isDraggableFileNode = isCaseResolverDraggableFileNode({
    nodeType: node.type,
    fileType,
    isChildStructureNode: isChildStructureSectionNode,
  });
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
  
  const nodeOwnerCaseIds = (() => {
    if (isChildStructureSectionNode) return [];
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
    childCaseIdSet.has(caseId),
  );
  const childOwnerCaseNames = Array.from(
    new Set(
      childOwnerCaseIds.map(
        (caseId: string): string => caseNameById.get(caseId) ?? caseId,
      ),
    ),
  );
  const isChildOwnedStructureNode = childOwnerCaseNames.length > 0;
  const childStructureHint =
    childOwnerCaseNames.length === 1
      ? `Child case structure: ${childOwnerCaseNames[0]}`
      : `Child case structure: ${childOwnerCaseNames.join(', ')}`;
  
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
  const stateClassName = isChildStructureSectionNode
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

  const handleClick = (): void => {
    if (!isSelected) {
      select();
    }
    if (isChildStructureSectionNode) return;
    if (folderPath !== null) {
      onSelectFolder(folderPath);
      return;
    }
    if (fileId) {
      if (fileType === 'case') {
        return;
      }
      if (isSelected && fileType !== 'case') {
        onDeactivateActiveFile();
        return;
      }
      if (fileType === 'document' || fileType === 'scanfile') {
        onEditFile(fileId);
      } else {
        onSelectFile(fileId);
      }
      return;
    }
    if (assetId) {
      onSelectAsset(assetId);
    }
  };

  return (
    <div
      className={`group flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-sm ${stateClassName}`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      role='button'
      tabIndex={0}
      title={
        isChildStructureSectionNode
          ? 'Children cases folder structure'
          : isNodeFileAsset
            ? 'Canvas file — click to open'
            : isCanvasCaseFile
              ? 'Drag file to canvas'
              : node.name
      }
      onClick={handleClick}
      onDoubleClick={(): void => {
        if (isChildStructureSectionNode) return;
        startRename();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <span
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
        className={`inline-flex size-5 shrink-0 items-center justify-center rounded ${
          isDraggableFileNode ? `cursor-grab active:cursor-grabbing ${hoverOnlyControlClass}` : 'cursor-default'
        }`}
      >
        <DragHandleIcon
          className={`size-3 ${
            isDraggableFileNode
              ? (isNodeFileAsset
                ? 'text-violet-400/80'
                : 'text-sky-300/90')
              : 'text-gray-500'
          }`}
        />
      </span>
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
          {isExpanded ? <ChevronDown className='size-3' /> : <ChevronRight className='size-3' />}
        </button>
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
      <Icon className='size-4 shrink-0' />
      {isFolder && isFolderLocked && !isChildStructureSectionNode ? (
        <Lock className='size-3.5 shrink-0 text-amber-300' aria-hidden='true' />
      ) : null}
      {isChildOwnedStructureNode ? (
        <span
          className='inline-flex size-4 shrink-0 items-center justify-center rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
          title={childStructureHint}
          aria-label={childStructureHint}
        >
          <GitBranch className='size-3' />
        </span>
      ) : null}
      <div className='min-w-0 flex flex-1 items-center gap-1'>
        {isRenaming ? (
          <input
            autoFocus
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
            className='min-w-0 flex-1 rounded border border-blue-500 bg-gray-800 px-1.5 py-0.5 text-sm text-white outline-none'
          />
        ) : (
          <>
            <span className='min-w-0 flex-1 truncate'>{node.name}</span>
            {isChildOwnedStructureNode ? (
              <span
                className='inline-flex max-w-[140px] shrink-0 items-center truncate rounded border border-cyan-500/30 bg-cyan-500/10 px-1 text-[10px] font-medium text-cyan-200'
                title={childStructureHint}
              >
                {childOwnerCaseNames.length === 1
                  ? childOwnerCaseNames[0]
                  : `${childOwnerCaseNames.length} child cases`}
              </span>
            ) : null}
            {isLinkDropTarget ? (
              <span className='shrink-0 rounded bg-teal-500/30 px-1 text-[10px] font-medium text-teal-200'>
                Link →
              </span>
            ) : null}
          </>
        )}
      </div>
      
      {!isRenaming && isFolder && folderPath !== null && !isChildStructureSectionNode ? (
        <div className={`flex shrink-0 items-center gap-1 transition ${hoverOnlyControlClass}`}>
          <button
            type='button'
            className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-gray-300 transition hover:bg-muted/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
            title={!folderHasCaseFiles ? 'No case files in folder' : isFolderLocked ? 'Unlock folder files' : 'Lock folder files'}
            disabled={!folderHasCaseFiles}
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFolderLock(folderPath);
            }}
          >
            {isFolderLocked ? <Unlock className='size-3.5' /> : <Lock className='size-3.5' />}
          </button>
          <button
            type='button'
            className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50'
            title={folderHasLockedFiles ? 'Unlock folder files before removing' : 'Remove folder'}
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
        <div className={`flex shrink-0 items-center gap-1 transition ${hoverOnlyControlClass}`}>
          <button
            type='button'
            className={`inline-flex size-6 items-center justify-center rounded border transition ${
              isFileLocked
                ? 'border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 hover:text-amber-100'
                : 'border-border/60 bg-card/60 text-gray-300 hover:bg-muted/60 hover:text-white'
            }`}
            title={isFileLocked ? 'Unlock file' : 'Lock file'}
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFileLock(fileId);
            }}
          >
            {isFileLocked ? <Lock className='size-3.5' /> : <Unlock className='size-3.5' />}
          </button>
          <button
            type='button'
            className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50'
            title={isFileLocked ? 'Unlock file before removing' : 'Remove file'}
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
        <div className={`flex shrink-0 items-center gap-1 transition ${hoverOnlyControlClass}`}>
          <button
            type='button'
            className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200'
            title='Remove node file'
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
}
