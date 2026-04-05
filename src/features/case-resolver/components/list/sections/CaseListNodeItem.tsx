'use client';

import { FileText, GitBranch, Lock, Pin, ScanText, ChevronDown, ChevronRight } from 'lucide-react';
import React from 'react';

import {
  decodeCaseResolverCaseContentFileNodeId,
  decodeCaseResolverCaseContentFolderNodeId,
  fromCaseResolverCaseNodeId,
} from '@/features/case-resolver/master-tree';
import { Button, Badge, Input, Tooltip } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';
import { focusOnMount } from '@/shared/utils/focus-on-mount';
import type { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';

import { parseBoolean, formatCaseTimestamp } from '../case-list-utils';
import { useCaseListNodeRuntimeContext } from './CaseListNodeRuntimeContext';

export interface CaseListNodeItemProps {
  node: MasterTreeViewNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isRenaming: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: 'inside' | 'before' | 'after' | null;
  toggleExpand: () => void;
}

export const CaseListNodeItem = React.memo(function CaseListNodeItem(
  props: CaseListNodeItemProps
): React.JSX.Element {
  const {
    node,
    depth,
    hasChildren,
    isExpanded,
    isRenaming,
    isDragging,
    isDropTarget,
    dropPosition,
    toggleExpand,
  } = props;

  const {
    filesById,
    caseTagPathById,
    caseIdentifierPathById,
    caseCategoryPathById,
    renameDraft,
    onUpdateRenameDraft,
    onCommitRename,
    onCancelRename,
    handleToggleCaseStatus,
    handleToggleHeldCase,
    handleNestHeldCase,
    handlePrefetchCase,
    handlePrefetchFile,
    handleOpenCase,
    handleOpenFile,
    handleCreateCase,
    handleDeleteCase,
    FolderClosedIcon,
    FolderOpenIcon,
    heldCaseId,
    isHierarchyLocked,
    heldCaseFile,
    isHeldCaseAncestorOf,
  } = useCaseListNodeRuntimeContext();

  const caseId = fromCaseResolverCaseNodeId(node.id) ?? '';
  const caseContentFolderRef = decodeCaseResolverCaseContentFolderNodeId(node.id);
  const caseContentFileRef = decodeCaseResolverCaseContentFileNodeId(node.id);
  const isCaseContentFolderNode = Boolean(caseContentFolderRef);
  const isCaseContentFileNode = Boolean(caseContentFileRef);
  const caseFile = caseId ? (filesById.get(caseId) ?? null) : null;
  const caseContentFile = caseContentFileRef
    ? (filesById.get(caseContentFileRef.fileId) ?? null)
    : null;
  const caseStatus = caseFile?.caseStatus ?? 'pending';
  const createdAtLabel = formatCaseTimestamp(caseFile?.createdAt);
  const modifiedAtLabel = formatCaseTimestamp(caseFile?.updatedAt ?? caseFile?.createdAt);
  const caseContentUpdatedAtLabel = formatCaseTimestamp(
    caseContentFile?.updatedAt ?? caseContentFile?.createdAt
  );
  const caseIdentifierLabel = caseFile?.caseIdentifierId
    ? (caseIdentifierPathById.get(caseFile.caseIdentifierId) ?? caseFile.caseIdentifierId)
    : null;
  const isHeldCase = Boolean(caseFile) && heldCaseId === caseFile?.id;
  const isLocked =
    caseFile?.isLocked === true ||
    caseContentFile?.isLocked === true ||
    parseBoolean(node.metadata?.['isLocked']);
  const isStatusToggleDisabled = !caseFile || isLocked;

  const targetCaseId = caseId;
  const canShowNestHeldAction =
    Boolean(heldCaseId) && targetCaseId.length > 0 && heldCaseId !== targetCaseId;
  const canNestHeldHere =
    canShowNestHeldAction &&
    !isHierarchyLocked &&
    Boolean(heldCaseFile) &&
    heldCaseFile?.isLocked !== true &&
    !isHeldCaseAncestorOf(targetCaseId);
  const nestHeldDisabledReason = (() => {
    if (!canShowNestHeldAction) return null;
    if (isHierarchyLocked) return 'Unlock hierarchy to move held case.';
    if (!heldCaseFile) return 'Held case is no longer available.';
    if (heldCaseFile.isLocked === true) return 'Held case is locked.';
    if (isHeldCaseAncestorOf(targetCaseId)) return 'Cannot nest held case under its descendant.';
    return null;
  })();

  const stateClassName =
    dropPosition === 'before'
      ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-blue-500/60'
      : dropPosition === 'after'
        ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-cyan-400/60'
        : isDragging
          ? 'opacity-50 text-gray-200'
          : isDropTarget
            ? 'bg-cyan-500/10 text-cyan-100'
            : 'text-gray-300 hover:bg-muted/50';

  const iconNode =
    hasChildren && isExpanded ? (
      <FolderOpenIcon className='size-4 shrink-0' />
    ) : (
      <FolderClosedIcon className='size-4 shrink-0' />
    );

  if (isCaseContentFolderNode) {
    return (
      <div
        className={cn(
          'group flex items-center gap-2 rounded px-2 py-1.5 text-sm transition',
          stateClassName
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
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
            {isExpanded ? (
              <ChevronDown className='size-3.5' />
            ) : (
              <ChevronRight className='size-3.5' />
            )}
          </Button>
        ) : (
          <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>
            •
          </span>
        )}
        {iconNode}
        <div className='min-w-0 flex flex-1 items-center gap-2'>
          <Button
            variant='link'
            className='h-auto min-w-0 justify-start p-0 truncate text-left text-sm text-gray-200 hover:text-white hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              if (hasChildren) {
                toggleExpand();
              }
            }}
            title={`Folder: ${node.name}`}
          >
            <span className='truncate'>{node.name}</span>
          </Button>
          <Badge
            variant='neutral'
            className='shrink-0 border-border/60 bg-card/30 text-[10px] h-4 px-1'
          >
            Folder
          </Badge>
        </div>
      </div>
    );
  }

  if (isCaseContentFileNode) {
    const fileId = caseContentFileRef?.fileId ?? '';
    const isScanFile =
      caseContentFile?.fileType === 'scanfile' || node.kind === 'case_content_file_scan';
    return (
      <div
        className={cn(
          'group flex items-center gap-2 rounded px-2 py-1.5 text-sm transition',
          stateClassName
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
        {isScanFile ? (
          <ScanText className='size-4 shrink-0 text-cyan-400/80' />
        ) : (
          <FileText className='size-4 shrink-0 text-sky-400/80' />
        )}
        {isLocked ? <Lock className='size-3.5 shrink-0 text-amber-300' /> : null}
        <div className='min-w-0 flex flex-1 items-center gap-2'>
          <Button
            variant='link'
            className='h-auto min-w-0 justify-start p-0 truncate text-left font-medium text-gray-100 hover:text-white hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
            onMouseEnter={(): void => {
              if (!fileId) return;
              handlePrefetchFile(fileId);
            }}
            onFocus={(): void => {
              if (!fileId) return;
              handlePrefetchFile(fileId);
            }}
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              if (!fileId) return;
              handleOpenFile(fileId);
            }}
            title={`Open file: ${caseContentFile?.name ?? node.name}`}
          >
            <span className='truncate'>{caseContentFile?.name ?? node.name}</span>
          </Button>
          <span className='min-w-0 truncate text-[10px] opacity-70'>
            Modified: {caseContentUpdatedAtLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded px-2 py-1.5 text-sm transition',
        stateClassName
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {hasChildren ? (
        <Button
          variant='ghost'
          size='sm'
          className='size-4 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            toggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse case' : 'Expand case'}
          title={isExpanded ? 'Collapse case' : 'Expand case'}>
          {isExpanded ? (
            <ChevronDown className='size-3.5' />
          ) : (
            <ChevronRight className='size-3.5' />
          )}
        </Button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
      )}
      {iconNode}
      {isLocked ? <Lock className='size-3.5 shrink-0 text-amber-300' /> : null}

      <div className='min-w-0 flex flex-1 items-center gap-2'>
        {isRenaming ? (
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
            className='h-7 min-w-0 flex-1 border-blue-500 bg-gray-800 text-sm text-white'
           aria-label='Input field' title='Input field'/>
        ) : (
          <>
            <div className='min-w-0 flex flex-1 flex-col'>
              {caseFile ? (
                <Button
                  variant='link'
                  className='h-auto min-w-0 justify-start p-0 truncate text-left font-medium text-inherit hover:text-white hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
                  onMouseEnter={(): void => {
                    handlePrefetchCase(caseFile.id);
                  }}
                  onFocus={(): void => {
                    handlePrefetchCase(caseFile.id);
                  }}
                  onClick={(event): void => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleOpenCase(caseFile.id);
                  }}
                  title={`Open case: ${caseFile.name}`}
                >
                  <span className='truncate'>{caseFile.name}</span>
                </Button>
              ) : (
                <span className='min-w-0 truncate font-medium'>{node.name}</span>
              )}
              <span className='min-w-0 truncate text-[10px] opacity-70'>
                Created: {createdAtLabel} · Modified: {modifiedAtLabel}
              </span>
            </div>
            <Tooltip
              content={
                isLocked
                  ? 'Locked cases cannot be status-toggled from the list.'
                  : 'Click to toggle status'
              }
            >
              <StatusBadge
                status={caseStatus}
                size='sm'
                variant={caseStatus === 'completed' ? 'success' : 'warning'}
                className={cn(
                  'h-5 font-bold uppercase',
                  !isStatusToggleDisabled && 'cursor-pointer hover:brightness-110'
                )}
                onClick={(): void => {
                  if (isStatusToggleDisabled) return;
                  if (!caseFile) return;
                  handleToggleCaseStatus(caseFile.id).catch((): void => {});
                }}
              />
            </Tooltip>
            <Button
              variant='outline'
              size='sm'
              className={cn(
                'h-5 gap-1 px-1.5 text-[10px] font-bold uppercase',
                isHeldCase
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                  : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/50 hover:text-cyan-100'
              )}
              onClick={(event): void => {
                event.preventDefault();
                event.stopPropagation();
                if (!caseFile) return;
                handleToggleHeldCase(caseFile.id);
              }}
              title={isHeldCase ? 'Unhold case' : 'Hold case at top'}
            >
              <Pin className='size-2.5' />
              {isHeldCase ? 'Held' : 'Hold'}
            </Button>
            {canShowNestHeldAction ? (
              <Button
                variant='outline'
                size='sm'
                className={cn(
                  'h-5 px-1.5 text-[10px] font-bold uppercase',
                  canNestHeldHere
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-100 hover:brightness-110'
                    : 'cursor-not-allowed border-blue-500/20 bg-blue-500/5 text-blue-200/50'
                )}
                disabled={!canNestHeldHere}
                title={
                  canNestHeldHere
                    ? 'Nest held case here'
                    : (nestHeldDisabledReason ?? 'Cannot nest held case here')
                }
                onClick={(event): void => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!caseFile || !canNestHeldHere) return;
                  handleNestHeldCase(caseFile.id);
                }}
              >
                Nest
              </Button>
            ) : null}
            {caseFile?.tagId ? (
              <Badge
                variant='outline'
                className='bg-blue-500/5 text-blue-300 border-blue-500/20 text-[10px] h-5 px-1.5 max-w-[120px] truncate'
              >
                {caseTagPathById.get(caseFile.tagId) ?? caseFile.tagId}
              </Badge>
            ) : null}
            {caseIdentifierLabel ? (
              <Badge
                variant='outline'
                className='bg-amber-500/5 text-amber-200 border-amber-500/20 text-[10px] h-5 px-1.5 max-w-[180px] truncate gap-1'
                title={`Signature: ${caseIdentifierLabel}`}
              >
                <GitBranch className='size-2.5 shrink-0' />
                <span className='truncate'>{caseIdentifierLabel}</span>
              </Badge>
            ) : null}
            {caseFile?.categoryId ? (
              <Badge
                variant='outline'
                className='bg-emerald-500/5 text-emerald-200 border-emerald-500/20 text-[10px] h-5 px-1.5 max-w-[120px] truncate'
              >
                {caseCategoryPathById.get(caseFile.categoryId) ?? caseFile.categoryId}
              </Badge>
            ) : null}
          </>
        )}
      </div>

      {!isRenaming && caseFile ? (
        <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
          <Button
            variant='outline'
            size='xs'
            className='h-7'
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              handleCreateCase(caseFile.id);
            }}
          >
            Child
          </Button>
          <Button
            variant='outline'
            size='xs'
            className='h-7 text-rose-400 hover:text-rose-300'
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              handleDeleteCase(caseId);
            }}
          >
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
});
