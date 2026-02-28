'use client';

import React from 'react';
import { FileText, GitBranch, Lock, Pin, ScanText } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import {
  decodeCaseResolverCaseContentFileNodeId,
  decodeCaseResolverCaseContentFolderNodeId,
  fromCaseResolverCaseNodeId,
} from '@/features/case-resolver/master-tree';
import { parseBoolean, formatCaseTimestamp } from '../case-list-utils';

type FolderIconComponent = React.ComponentType<{ className?: string }>;
type CaseListNodeItemController = Pick<
  MasterFolderTreeController,
  'renameDraft' | 'updateRenameDraft' | 'commitRename' | 'cancelRename'
>;

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
  filesById: Map<string, CaseResolverFile>;
  caseTagPathById: Map<string, string>;
  caseIdentifierPathById: Map<string, string>;
  caseCategoryPathById: Map<string, string>;
  controller: CaseListNodeItemController;
  handleToggleCaseStatus: (id: string) => Promise<void>;
  heldCaseId: string | null;
  canNestHeldHere: boolean;
  canShowNestHeldAction: boolean;
  nestHeldDisabledReason?: string | null;
  handleToggleHeldCase: (caseId: string) => void;
  handleNestHeldCase: (targetCaseId: string) => void;
  handlePrefetchCase: (id: string) => void;
  handlePrefetchFile: (id: string) => void;
  handleOpenCase: (id: string) => void;
  handleOpenFile: (id: string) => void;
  handleCreateCase: (parentId: string | null) => void;
  handleDeleteCase: (id: string) => void;
  FolderClosedIcon: FolderIconComponent;
  FolderOpenIcon: FolderIconComponent;
}

export const CaseListNodeItem = React.memo(function CaseListNodeItem({
  node,
  depth,
  hasChildren,
  isExpanded,
  isRenaming,
  isDragging,
  isDropTarget,
  dropPosition,
  toggleExpand,
  filesById,
  caseTagPathById,
  caseIdentifierPathById,
  caseCategoryPathById,
  controller,
  handleToggleCaseStatus,
  heldCaseId,
  canNestHeldHere,
  canShowNestHeldAction,
  nestHeldDisabledReason,
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
}: CaseListNodeItemProps): React.JSX.Element {
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
        className={`group flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${stateClassName}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type='button'
            className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/60'
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              toggleExpand();
            }}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>
            •
          </span>
        )}
        {iconNode}
        <div className='min-w-0 flex flex-1 items-center gap-2'>
          <button
            type='button'
            draggable={false}
            className='min-w-0 truncate text-left text-sm text-gray-200 hover:underline focus:outline-none focus:underline'
            onClick={(event): void => {
              event.preventDefault();
              event.stopPropagation();
              if (hasChildren) {
                toggleExpand();
              }
            }}
            title={`Folder: ${node.name}`}
          >
            {node.name}
          </button>
          <span className='shrink-0 rounded border border-border/60 bg-card/30 px-1.5 py-0.5 text-[10px] text-gray-400'>
            Folder
          </span>
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
        className={`group flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${stateClassName}`}
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
          <button
            type='button'
            draggable={false}
            className='min-w-0 truncate text-left font-medium text-gray-100 hover:underline focus:outline-none focus:underline'
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
            {caseContentFile?.name ?? node.name}
          </button>
          <span className='min-w-0 truncate text-[10px] opacity-70'>
            Modified: {caseContentUpdatedAtLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${stateClassName}`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {hasChildren ? (
        <button
          type='button'
          className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/60'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            toggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse case' : 'Expand case'}
        >
          {isExpanded ? '▾' : '▸'}
        </button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
      )}
      {iconNode}
      {isLocked ? <Lock className='size-3.5 shrink-0 text-amber-300' /> : null}

      <div className='min-w-0 flex flex-1 items-center gap-2'>
        {isRenaming ? (
          <input
            autoFocus
            value={controller.renameDraft}
            onChange={(event): void => {
              controller.updateRenameDraft(event.target.value);
            }}
            onBlur={(): void => {
              void controller.commitRename();
            }}
            onKeyDown={(event): void => {
              event.stopPropagation();
              if (event.key === 'Enter') {
                event.preventDefault();
                void controller.commitRename();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                controller.cancelRename();
              }
            }}
            onClick={(event): void => {
              event.stopPropagation();
            }}
            className='min-w-0 flex-1 rounded border border-blue-500 bg-gray-800 px-1.5 py-0.5 text-sm text-white outline-none'
          />
        ) : (
          <>
            <div className='min-w-0 flex flex-1 flex-col'>
              {caseFile ? (
                <button
                  type='button'
                  draggable={false}
                  className='min-w-0 truncate text-left font-medium text-inherit hover:underline focus:outline-none focus:underline'
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
                  {caseFile.name}
                </button>
              ) : (
                <span className='min-w-0 truncate font-medium'>{node.name}</span>
              )}
              <span className='min-w-0 truncate text-[10px] opacity-70'>
                Created: {createdAtLabel} · Modified: {modifiedAtLabel}
              </span>
            </div>
            <button
              type='button'
              draggable={false}
              className={`${
                caseStatus === 'completed'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
              } inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize transition ${isStatusToggleDisabled ? 'cursor-not-allowed opacity-60' : 'hover:brightness-110'}`}
              disabled={isStatusToggleDisabled}
              onClick={(event): void => {
                event.preventDefault();
                event.stopPropagation();
                if (!caseFile) return;
                handleToggleCaseStatus(caseFile.id).catch((): void => {});
              }}
              title={
                isLocked
                  ? 'Locked cases cannot be status-toggled from the list.'
                  : 'Click to toggle status'
              }
            >
              {caseStatus}
            </button>
            <button
              type='button'
              draggable={false}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium transition ${
                isHeldCase
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                  : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/50 hover:text-cyan-100'
              }`}
              onClick={(event): void => {
                event.preventDefault();
                event.stopPropagation();
                if (!caseFile) return;
                handleToggleHeldCase(caseFile.id);
              }}
              title={isHeldCase ? 'Unhold case' : 'Hold case at top'}
            >
              <Pin className='size-3' />
              {isHeldCase ? 'Held' : 'Hold'}
            </button>
            {canShowNestHeldAction ? (
              <button
                type='button'
                draggable={false}
                className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium transition ${
                  canNestHeldHere
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-100 hover:brightness-110'
                    : 'cursor-not-allowed border-blue-500/20 bg-blue-500/5 text-blue-200/50'
                }`}
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
                Nest held here
              </button>
            ) : null}
            {caseFile?.tagId ? (
              <span className='max-w-[220px] truncate text-[10px] text-cyan-200/80'>
                {caseTagPathById.get(caseFile.tagId) ?? caseFile.tagId}
              </span>
            ) : null}
            {caseIdentifierLabel ? (
              <span
                className='inline-flex max-w-[280px] items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200'
                title={caseIdentifierLabel}
              >
                <GitBranch className='size-3 shrink-0' />
                <span className='truncate'>Signature: {caseIdentifierLabel}</span>
              </span>
            ) : null}
            {caseFile?.categoryId ? (
              <span className='max-w-[220px] truncate text-[10px] text-emerald-200/80'>
                {caseCategoryPathById.get(caseFile.categoryId) ?? caseFile.categoryId}
              </span>
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
