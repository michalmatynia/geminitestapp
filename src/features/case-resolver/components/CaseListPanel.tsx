'use client';

import { Folder, FolderOpen, GitBranch, Lock, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useMemo, useRef } from 'react';

import { createCaseResolverCasesMasterTreeAdapter } from '@/features/case-resolver/adapter';
import {
  buildMasterCaseNodesFromCaseResolverWorkspace,
  decodeCaseResolverCaseMasterNodeId,
  fromCaseResolverCaseNodeId,
  toCaseResolverCaseNodeId,
} from '@/features/case-resolver/master-tree';
import { useMasterFolderTreeInstance } from '@/features/foldertree';
import { applyInternalMasterTreeDrop } from '@/features/foldertree/master/internal-drop';
import {
  MasterFolderTree,
  type MasterFolderTreeProps,
} from '@/features/foldertree/master/MasterFolderTree';
import {
  Badge,
  Button,
  Card,
  StandardDataTablePanel,
} from '@/shared/ui';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { useAdminCaseResolverCases } from '../context/AdminCaseResolverCasesContext';
import { useAdminCaseResolverCasesState } from '../hooks/useAdminCaseResolverCasesState';
import { CaseFilterPanel } from './CaseFilterPanel';
import { CaseListHeader } from './list/CaseListHeader';

const parseBoolean = (value: unknown): boolean => value === true;

export const CaseListPanel = memo(function CaseListPanel(): React.JSX.Element {
  const router = useRouter();
  const {
    workspace,
    isLoading,
    setIsCreateCaseModalOpen,
    setCaseDraft,
    handleDeleteCase,
    handleMoveCase,
    handleReorderCase,
    handleRenameCase,
  } = useAdminCaseResolverCases();
  const {
    files,
    filesById,
    filteredCases,
    visibleCaseIds,
    caseTagPathById,
    caseIdentifierPathById,
    caseCategoryPathById,
  } = useAdminCaseResolverCasesState();

  const baseCaseNodes = useMemo(
    (): MasterTreeNode[] => buildMasterCaseNodesFromCaseResolverWorkspace(workspace),
    [workspace]
  );

  const visibleCaseNodeIdSet = useMemo((): Set<string> => {
    if (filteredCases.length === files.length) return new Set<string>();
    return new Set<string>(
      Array.from(visibleCaseIds).map((caseId: string): string => toCaseResolverCaseNodeId(caseId))
    );
  }, [files.length, filteredCases.length, visibleCaseIds]);

  const masterNodes = useMemo((): MasterTreeNode[] => {
    if (filteredCases.length === files.length) return baseCaseNodes;
    return baseCaseNodes.filter((node: MasterTreeNode): boolean => visibleCaseNodeIdSet.has(node.id));
  }, [baseCaseNodes, files.length, filteredCases.length, visibleCaseNodeIdSet]);

  const autoExpandedNodeIds = useMemo((): string[] | undefined => {
    if (filteredCases.length === files.length) return undefined;
    return masterNodes.filter((node: MasterTreeNode): boolean => node.type === 'folder').map((node) => node.id);
  }, [files.length, filteredCases.length, masterNodes]);

  const adapterOperationsRef = useRef({
    handleMoveCase,
    handleReorderCase,
    handleRenameCase,
  });
  adapterOperationsRef.current = {
    handleMoveCase,
    handleReorderCase,
    handleRenameCase,
  };

  const adapter = useMemo(
    () =>
      createCaseResolverCasesMasterTreeAdapter({
        moveCase: async (
          caseId: string,
          targetParentCaseId: string | null,
          targetIndex?: number
        ): Promise<void> => {
          await adapterOperationsRef.current.handleMoveCase(caseId, targetParentCaseId, targetIndex);
        },
        reorderCase: async (
          caseId: string,
          targetCaseId: string,
          position: 'before' | 'after'
        ): Promise<void> => {
          await adapterOperationsRef.current.handleReorderCase(caseId, targetCaseId, position);
        },
        renameCase: async (caseId: string, nextName: string): Promise<void> => {
          await adapterOperationsRef.current.handleRenameCase(caseId, nextName);
        },
      }),
    []
  );

  const {
    appearance: { resolveIcon, rootDropUi },
    controller,
  } = useMasterFolderTreeInstance({
    instance: 'case_resolver_cases',
    nodes: masterNodes,
    adapter,
    ...(autoExpandedNodeIds ? { expandedNodeIds: autoExpandedNodeIds } : {}),
  });

  const FolderClosedIcon = useMemo(
    () =>
      resolveIcon({
        slot: 'folderClosed',
        kind: 'case_entry',
        fallback: Folder,
        fallbackId: 'Folder',
      }),
    [resolveIcon]
  );
  const FolderOpenIcon = useMemo(
    () =>
      resolveIcon({
        slot: 'folderOpen',
        kind: 'case_entry',
        fallback: FolderOpen,
        fallbackId: 'FolderOpen',
      }),
    [resolveIcon]
  );

  const handleOpenCase = useCallback(
    (caseId: string): void => {
      router.push(`/admin/case-resolver?fileId=${encodeURIComponent(caseId)}`);
    },
    [router]
  );

  const handleCreateCase = useCallback(
    (parentCaseId: string | null = null): void => {
      setCaseDraft((previous) => ({
        ...previous,
        parentCaseId,
      }));
      setIsCreateCaseModalOpen(true);
    },
    [setCaseDraft, setIsCreateCaseModalOpen]
  );

  const canStartDrag = useCallback<NonNullable<MasterFolderTreeProps['canStartDrag']>>(
    ({ node }): boolean => {
      return !parseBoolean(node.metadata?.['isLocked']);
    },
    []
  );

  const canDrop = useCallback<NonNullable<MasterFolderTreeProps['canDrop']>>(
    ({ draggedNodeId, targetId, defaultAllowed }): boolean => {
      if (!defaultAllowed) return false;
      const dragged = decodeCaseResolverCaseMasterNodeId(draggedNodeId);
      if (!dragged) return false;
      if (targetId === null) return true;
      return decodeCaseResolverCaseMasterNodeId(targetId) !== null;
    },
    []
  );

  return (
    <StandardDataTablePanel
      header={
        <CaseListHeader
          onCreateCase={() => {
            handleCreateCase(null);
          }}
          filtersContent={<CaseFilterPanel />}
          filteredCount={filteredCases.length}
          totalCount={files.length}
        />
      }
      columns={[]}
      data={[]}
      isLoading={false}
      contentClassName='space-y-3'
    >
      {isLoading ? (
        <div className='py-20 text-center text-sm text-gray-500'>Loading cases...</div>
      ) : files.length === 0 ? (
        <Card
          variant='subtle'
          padding='lg'
          className='flex flex-col items-center justify-center border-dashed border-border/60 bg-card/20 py-20 text-center'
        >
          <Folder className='mb-4 size-10 text-muted-foreground/20' />
          <p className='text-sm text-muted-foreground'>No cases found. Create your first case.</p>
          <Button
            variant='outline'
            size='sm'
            className='mt-4'
            onClick={() => {
              handleCreateCase(null);
            }}
          >
            <Plus className='mr-2 size-4' /> Add Case
          </Button>
        </Card>
      ) : filteredCases.length === 0 ? (
        <Card
          variant='subtle'
          padding='lg'
          className='flex flex-col items-center justify-center border-dashed border-border/60 bg-card/20 py-20 text-center'
        >
          <p className='text-sm font-medium text-muted-foreground'>No cases match your current filters.</p>
        </Card>
      ) : (
        <MasterFolderTree
          controller={controller}
          canStartDrag={canStartDrag}
          canDrop={canDrop}
          rootDropUi={rootDropUi}
          onNodeDrop={async ({ draggedNodeId, targetId, position, rootDropZone }, ctlr): Promise<void> => {
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
            const caseId = fromCaseResolverCaseNodeId(node.id) ?? '';
            const caseFile = caseId ? (filesById.get(caseId) ?? null) : null;
            const caseStatus = caseFile?.caseStatus ?? 'pending';
            const isLocked = parseBoolean(node.metadata?.['isLocked']);
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

            const iconNode = hasChildren && isExpanded ? (
              <FolderOpenIcon className='size-4 shrink-0' />
            ) : (
              <FolderClosedIcon className='size-4 shrink-0' />
            );

            return (
              <div
                className={`group flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${stateClassName}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                role='button'
                tabIndex={0}
                onClick={select}
                onKeyDown={(event): void => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    select();
                  }
                }}
                onDoubleClick={(): void => {
                  startRename();
                }}
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
                      <span className='min-w-0 flex-1 truncate font-medium'>
                        {caseFile?.name ?? node.name}
                      </span>
                      <Badge
                        variant='neutral'
                        className={
                          caseStatus === 'completed'
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                            : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                        }
                      >
                        {caseStatus}
                      </Badge>
                      {caseFile?.tagId ? (
                        <span className='max-w-[220px] truncate text-[10px] text-cyan-200/80'>
                          {caseTagPathById.get(caseFile.tagId) ?? caseFile.tagId}
                        </span>
                      ) : null}
                      {caseFile?.caseIdentifierId ? (
                        <span
                          className='inline-flex size-4 shrink-0 items-center justify-center rounded border border-amber-500/40 bg-amber-500/10 text-amber-200'
                          title={
                            caseIdentifierPathById.get(caseFile.caseIdentifierId) ??
                            caseFile.caseIdentifierId
                          }
                        >
                          <GitBranch className='size-3' />
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
                        handleOpenCase(caseFile.id);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant='outline'
                      size='xs'
                      className='h-7'
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        startRename();
                      }}
                    >
                      Rename
                    </Button>
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
                        handleDeleteCase(caseFile.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      )}
    </StandardDataTablePanel>
  );
});
