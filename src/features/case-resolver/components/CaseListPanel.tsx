'use client';

import { Folder, FolderOpen, GitBranch, Lock, PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createCaseResolverCasesMasterTreeAdapter } from '@/features/case-resolver/adapter';
import {
  buildMasterCaseNodesFromCaseResolverWorkspace,
  decodeCaseResolverCaseMasterNodeId,
  fromCaseResolverCaseNodeId,
  toCaseResolverCaseNodeId,
} from '@/features/case-resolver/master-tree';
import { useMasterFolderTreeInstance } from '@/features/foldertree';
import {
  FolderTreeViewportV2,
  type FolderTreeViewportV2Props,
  applyInternalMasterTreeDrop,
} from '@/features/foldertree/v2';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
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
const parseTimestampMs = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const resolveCaseTreeOrderValue = (file: CaseResolverFile | null): number =>
  file && typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
    ? Math.max(0, Math.floor(file.caseTreeOrder))
    : Number.MAX_SAFE_INTEGER;
const CASE_ROW_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const formatCaseTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return CASE_ROW_TIMESTAMP_FORMATTER.format(parsed);
};
const sortCaseTreeNodes = ({
  nodes,
  filesById,
  sortBy,
  sortOrder,
}: {
  nodes: MasterTreeNode[];
  filesById: Map<string, CaseResolverFile>;
  sortBy: 'updated' | 'created' | 'name';
  sortOrder: 'asc' | 'desc';
}): MasterTreeNode[] => {
  const resolveNodeTimestamp = (
    node: MasterTreeNode,
    key: 'created' | 'updated'
  ): number => {
    const caseId = fromCaseResolverCaseNodeId(node.id);
    const caseFile = caseId ? (filesById.get(caseId) ?? null) : null;
    if (caseFile) {
      return key === 'updated'
        ? parseTimestampMs(caseFile.updatedAt ?? caseFile.createdAt)
        : parseTimestampMs(caseFile.createdAt);
    }
    const metadata =
      node.metadata && typeof node.metadata === 'object'
        ? node.metadata
        : null;
    const createdAt =
      typeof metadata?.['createdAt'] === 'string'
        ? metadata['createdAt']
        : null;
    const updatedAt =
      typeof metadata?.['updatedAt'] === 'string'
        ? metadata['updatedAt']
        : null;
    return key === 'updated'
      ? parseTimestampMs(updatedAt ?? createdAt)
      : parseTimestampMs(createdAt);
  };

  const sortedIndexByNodeId = new Map<string, number>();
  const nodesByParentId = new Map<string | null, MasterTreeNode[]>();
  nodes.forEach((node: MasterTreeNode): void => {
    const parentId = node.parentId ?? null;
    const current = nodesByParentId.get(parentId) ?? [];
    current.push(node);
    nodesByParentId.set(parentId, current);
  });

  const direction = sortOrder === 'asc' ? 1 : -1;
  nodesByParentId.forEach((siblings: MasterTreeNode[]): void => {
    const orderedSiblings = [...siblings].sort(
      (left: MasterTreeNode, right: MasterTreeNode): number => {
        if (sortBy === 'name') {
          const nameDelta = left.name.localeCompare(right.name);
          if (nameDelta !== 0) return nameDelta * direction;
        } else if (sortBy === 'created') {
          const createdDelta =
            resolveNodeTimestamp(left, 'created') -
            resolveNodeTimestamp(right, 'created');
          if (createdDelta !== 0) return createdDelta * direction;
        } else {
          const updatedDelta =
            resolveNodeTimestamp(left, 'updated') -
            resolveNodeTimestamp(right, 'updated');
          if (updatedDelta !== 0) return updatedDelta * direction;
        }

        const leftCaseId = fromCaseResolverCaseNodeId(left.id);
        const rightCaseId = fromCaseResolverCaseNodeId(right.id);
        const leftCaseFile = leftCaseId ? (filesById.get(leftCaseId) ?? null) : null;
        const rightCaseFile = rightCaseId ? (filesById.get(rightCaseId) ?? null) : null;
        const orderDelta =
          resolveCaseTreeOrderValue(leftCaseFile) -
          resolveCaseTreeOrderValue(rightCaseFile);
        if (orderDelta !== 0) return orderDelta;
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      }
    );
    orderedSiblings.forEach((node: MasterTreeNode, index: number): void => {
      sortedIndexByNodeId.set(node.id, index);
    });
  });

  return nodes.map((node: MasterTreeNode): MasterTreeNode => {
    const sortIndex = sortedIndexByNodeId.get(node.id);
    if (sortIndex === undefined || sortIndex === node.sortOrder) return node;
    return {
      ...node,
      sortOrder: sortIndex,
    };
  });
};

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
    caseSortBy,
    caseSortOrder,
  } = useAdminCaseResolverCases();
  const {
    files,
    filesById,
    filteredCases,
    caseTagPathById,
    caseIdentifierPathById,
    caseCategoryPathById,
  } = useAdminCaseResolverCasesState();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const baseCaseNodes = useMemo(
    (): MasterTreeNode[] =>
      sortCaseTreeNodes({
        nodes: buildMasterCaseNodesFromCaseResolverWorkspace(workspace),
        filesById,
        sortBy: caseSortBy,
        sortOrder: caseSortOrder,
      }),
    [caseSortBy, caseSortOrder, filesById, workspace]
  );

  const totalPages = useMemo((): number => {
    if (filteredCases.length === 0) return 1;
    return Math.max(1, Math.ceil(filteredCases.length / pageSize));
  }, [filteredCases.length, pageSize]);

  useEffect((): void => {
    setPage((currentPage: number): number => {
      if (currentPage < 1) return 1;
      if (currentPage > totalPages) return totalPages;
      return currentPage;
    });
  }, [totalPages]);

  const pagedCaseIds = useMemo((): string[] => {
    if (filteredCases.length === 0) return [];
    const startIndex = (page - 1) * pageSize;
    if (startIndex >= filteredCases.length) return [];
    return filteredCases
      .slice(startIndex, startIndex + pageSize)
      .map((file) => file.id);
  }, [filteredCases, page, pageSize]);

  const parentCaseIdByCaseId = useMemo((): Map<string, string | null> => {
    const map = new Map<string, string | null>();
    files.forEach((file): void => {
      const parentCaseId = file.parentCaseId?.trim() ?? '';
      map.set(file.id, parentCaseId.length > 0 ? parentCaseId : null);
    });
    return map;
  }, [files]);

  const visibleCaseIdSet = useMemo((): Set<string> => {
    if (pagedCaseIds.length === 0) return new Set<string>();
    const scoped = new Set<string>();
    const visited = new Set<string>();
    const includeWithAncestors = (caseId: string): void => {
      let currentCaseId: string | null = caseId;
      while (currentCaseId && !visited.has(currentCaseId)) {
        visited.add(currentCaseId);
        scoped.add(currentCaseId);
        currentCaseId = parentCaseIdByCaseId.get(currentCaseId) ?? null;
      }
    };
    pagedCaseIds.forEach((caseId: string): void => {
      includeWithAncestors(caseId);
    });
    return scoped;
  }, [pagedCaseIds, parentCaseIdByCaseId]);

  const visibleCaseNodeIdSet = useMemo(
    (): Set<string> =>
      new Set<string>(
        Array.from(visibleCaseIdSet).map((caseId: string): string =>
          toCaseResolverCaseNodeId(caseId)
        )
      ),
    [visibleCaseIdSet]
  );

  const isCaseSubsetVisible = useMemo(
    (): boolean => visibleCaseIdSet.size !== files.length,
    [files.length, visibleCaseIdSet]
  );

  const masterNodes = useMemo((): MasterTreeNode[] => {
    if (!isCaseSubsetVisible) return baseCaseNodes;
    return baseCaseNodes.filter((node: MasterTreeNode): boolean => visibleCaseNodeIdSet.has(node.id));
  }, [baseCaseNodes, isCaseSubsetVisible, visibleCaseNodeIdSet]);

  const autoExpandedNodeIds = useMemo((): string[] | undefined => {
    if (!isCaseSubsetVisible) return undefined;
    return masterNodes.filter((node: MasterTreeNode): boolean => node.type === 'folder').map((node) => node.id);
  }, [isCaseSubsetVisible, masterNodes]);

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
    ...(autoExpandedNodeIds
      ? { initiallyExpandedNodeIds: autoExpandedNodeIds }
      : {}),
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

  const canStartDrag = useCallback<NonNullable<FolderTreeViewportV2Props['canStartDrag']>>(
    ({ node }): boolean => {
      return !parseBoolean(node.metadata?.['isLocked']);
    },
    []
  );

  const canDrop = useCallback<NonNullable<FolderTreeViewportV2Props['canDrop']>>(
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
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
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
            size='icon-lg'
            className='mt-4'
            aria-label='Create new case'
            onClick={() => {
              handleCreateCase(null);
            }}
          >
            <PlusIcon className='h-6 w-6' />
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
        <FolderTreeViewportV2
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
            const createdAtLabel = formatCaseTimestamp(caseFile?.createdAt);
            const modifiedAtLabel = formatCaseTimestamp(
              caseFile?.updatedAt ?? caseFile?.createdAt
            );
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
                      <div className='min-w-0 flex flex-1 flex-col'>
                        <span className='min-w-0 truncate font-medium'>
                          {caseFile?.name ?? node.name}
                        </span>
                        <span className='min-w-0 truncate text-[10px] opacity-70'>
                          Created: {createdAtLabel} · Modified: {modifiedAtLabel}
                        </span>
                      </div>
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
