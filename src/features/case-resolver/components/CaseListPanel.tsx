'use client';

import {
  ArrowDown,
  ArrowUp,
  Folder,
  FolderOpen,
  GitBranch,
  Lock,
  PlusIcon,
  Save,
  Unlock,
} from 'lucide-react';
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
  Button,
  Card,
  SelectSimple,
  StandardDataTablePanel,
} from '@/shared/ui';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { useAdminCaseResolverCases } from '../context/AdminCaseResolverCasesContext';
import { useAdminCaseResolverCasesState } from '../hooks/useAdminCaseResolverCasesState';
import { CaseFilterPanel } from './CaseFilterPanel';
import { CaseListHeader } from './list/CaseListHeader';

const parseBoolean = (value: unknown): boolean => value === true;
const CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF =
  '/admin/settings/folder-trees#folder-tree-instance-case_resolver_cases';
const parseTimestampMs = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const resolveCaseStatusRank = (
  status: CaseResolverFile['caseStatus'] | null | undefined,
): number => (status === 'completed' ? 1 : 0);
const resolveBinaryRank = (value: boolean | null | undefined): number =>
  value === true ? 1 : 0;
const resolveSignatureLabel = (
  file: CaseResolverFile | null,
  caseIdentifierPathById: Map<string, string>,
): string => {
  if (!file?.caseIdentifierId) return '';
  return caseIdentifierPathById.get(file.caseIdentifierId)?.trim() ?? '';
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
  caseIdentifierPathById,
  sortBy,
  sortOrder,
}: {
  nodes: MasterTreeNode[];
  filesById: Map<string, CaseResolverFile>;
  caseIdentifierPathById: Map<string, string>;
  sortBy:
    | 'updated'
    | 'created'
    | 'name'
    | 'status'
    | 'signature'
    | 'locked'
    | 'sent';
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
        const leftCaseId = fromCaseResolverCaseNodeId(left.id);
        const rightCaseId = fromCaseResolverCaseNodeId(right.id);
        const leftCaseFile = leftCaseId ? (filesById.get(leftCaseId) ?? null) : null;
        const rightCaseFile = rightCaseId ? (filesById.get(rightCaseId) ?? null) : null;

        if (sortBy === 'name') {
          const nameDelta = left.name.localeCompare(right.name);
          if (nameDelta !== 0) return nameDelta * direction;
        } else if (sortBy === 'created') {
          const createdDelta =
            resolveNodeTimestamp(left, 'created') -
            resolveNodeTimestamp(right, 'created');
          if (createdDelta !== 0) return createdDelta * direction;
        } else if (sortBy === 'updated') {
          const updatedDelta =
            resolveNodeTimestamp(left, 'updated') -
            resolveNodeTimestamp(right, 'updated');
          if (updatedDelta !== 0) return updatedDelta * direction;
        } else if (sortBy === 'status') {
          const statusDelta =
            resolveCaseStatusRank(leftCaseFile?.caseStatus) -
            resolveCaseStatusRank(rightCaseFile?.caseStatus);
          if (statusDelta !== 0) return statusDelta * direction;
        } else if (sortBy === 'signature') {
          const leftSignatureLabel = resolveSignatureLabel(
            leftCaseFile,
            caseIdentifierPathById,
          );
          const rightSignatureLabel = resolveSignatureLabel(
            rightCaseFile,
            caseIdentifierPathById,
          );
          const leftIsEmpty = leftSignatureLabel.length === 0;
          const rightIsEmpty = rightSignatureLabel.length === 0;
          if (leftIsEmpty !== rightIsEmpty) {
            if (sortOrder === 'asc') return leftIsEmpty ? 1 : -1;
            return leftIsEmpty ? -1 : 1;
          }
          if (!leftIsEmpty && !rightIsEmpty) {
            const signatureDelta = leftSignatureLabel.localeCompare(
              rightSignatureLabel,
            );
            if (signatureDelta !== 0) return signatureDelta * direction;
          }
        } else if (sortBy === 'locked') {
          const lockedDelta =
            resolveBinaryRank(leftCaseFile?.isLocked) -
            resolveBinaryRank(rightCaseFile?.isLocked);
          if (lockedDelta !== 0) return lockedDelta * direction;
        } else if (sortBy === 'sent') {
          const sentDelta =
            resolveBinaryRank(leftCaseFile?.isSent) -
            resolveBinaryRank(rightCaseFile?.isSent);
          if (sentDelta !== 0) return sentDelta * direction;
        }

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
    setEditingCaseId,
    handleDeleteCase,
    handleMoveCase,
    handleReorderCase,
    handleRenameCase,
    handleToggleCaseStatus,
    caseSortBy,
    caseSortOrder,
    setCaseSortBy,
    setCaseSortOrder,
    handleSaveListViewDefaults,
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
  const [isHierarchyLocked, setIsHierarchyLocked] = useState(true);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);

  const handleSaveDefaults = useCallback(async (): Promise<void> => {
    setIsSavingDefaults(true);
    try {
      await handleSaveListViewDefaults();
    } finally {
      setIsSavingDefaults(false);
    }
  }, [handleSaveListViewDefaults]);

  const baseCaseNodes = useMemo(
    (): MasterTreeNode[] =>
      sortCaseTreeNodes({
        nodes: buildMasterCaseNodesFromCaseResolverWorkspace(workspace),
        filesById,
        caseIdentifierPathById,
        sortBy: caseSortBy,
        sortOrder: caseSortOrder,
      }),
    [caseIdentifierPathById, caseSortBy, caseSortOrder, filesById, workspace]
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
      setEditingCaseId(null);
      setCaseDraft({
        name: '',
        folder: '',
        parentCaseId,
        caseStatus: 'pending',
        referenceCaseIds: [],
        tagId: null,
        caseIdentifierId: null,
        categoryId: null,
        documentContent: '',
        documentCity: null,
        documentDate: null,
        isLocked: false,
        isSent: false,
        activeDocumentVersion: 'original',
      });
      setIsCreateCaseModalOpen(true);
    },
    [setCaseDraft, setEditingCaseId, setIsCreateCaseModalOpen]
  );

  const handleEditCase = useCallback(
    (caseFile: CaseResolverFile): void => {
      setEditingCaseId(caseFile.id);
      setCaseDraft({
        name: caseFile.name,
        folder: caseFile.folder ?? '',
        parentCaseId: caseFile.parentCaseId ?? '',
        caseStatus: caseFile.caseStatus ?? 'pending',
        caseIdentifierId: caseFile.caseIdentifierId ?? '',
        tagId: caseFile.tagId ?? '',
        categoryId: caseFile.categoryId ?? '',
        referenceCaseIds: caseFile.referenceCaseIds ?? [],
        documentContent: caseFile.documentContent ?? '',
        documentCity: caseFile.documentCity ?? '',
        documentDate: caseFile.documentDate ?? null,
        isLocked: caseFile.isLocked === true,
        isSent: caseFile.isSent === true,
        activeDocumentVersion: caseFile.activeDocumentVersion ?? 'original',
      });
      setIsCreateCaseModalOpen(true);
    },
    [setCaseDraft, setEditingCaseId, setIsCreateCaseModalOpen],
  );

  const canStartDrag = useCallback<NonNullable<FolderTreeViewportV2Props['canStartDrag']>>(
    ({ node }): boolean => {
      if (isHierarchyLocked) return false;
      return !parseBoolean(node.metadata?.['isLocked']);
    },
    [isHierarchyLocked]
  );

  const canDrop = useCallback<NonNullable<FolderTreeViewportV2Props['canDrop']>>(
    ({ draggedNodeId, targetId, defaultAllowed }): boolean => {
      if (isHierarchyLocked) return false;
      if (!defaultAllowed) return false;
      const dragged = decodeCaseResolverCaseMasterNodeId(draggedNodeId);
      if (!dragged) return false;
      if (targetId === null) return true;
      return decodeCaseResolverCaseMasterNodeId(targetId) !== null;
    },
    [isHierarchyLocked]
  );

  const renderSortingControls = (className = ''): React.JSX.Element => (
    <div
      className={`sticky top-2 z-20 w-full rounded-md border border-border/60 bg-card/95 px-3 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 ${className}`.trim()}
    >
      <div className='flex w-full items-center justify-end gap-2 max-sm:flex-wrap'>
        <SelectSimple
          size='sm'
          value={caseSortBy}
          onValueChange={(value: string): void => {
            if (
              value === 'updated' ||
              value === 'created' ||
              value === 'name' ||
              value === 'status' ||
              value === 'signature' ||
              value === 'locked' ||
              value === 'sent'
            ) {
              setCaseSortBy(value);
            }
          }}
          options={[
            { value: 'updated', label: 'Date modified' },
            { value: 'created', label: 'Date created' },
            { value: 'name', label: 'Name' },
            { value: 'status', label: 'Status' },
            { value: 'signature', label: 'Signature' },
            { value: 'locked', label: 'Lock state' },
            { value: 'sent', label: 'Sent state' },
          ]}
          className='w-40 shrink-0'
          triggerClassName='h-8 text-xs'
          ariaLabel='Sort cases by'
        />
        <Button
          variant='outline'
          size='sm'
          className='h-8 shrink-0'
          onClick={(): void => {
            setCaseSortOrder(caseSortOrder === 'asc' ? 'desc' : 'asc');
          }}
        >
          {caseSortOrder === 'asc' ? (
            <ArrowUp className='mr-1 size-3.5' />
          ) : (
            <ArrowDown className='mr-1 size-3.5' />
          )}
          {caseSortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='h-8 shrink-0'
          onClick={(): void => {
            setIsHierarchyLocked((current: boolean): boolean => !current);
          }}
          title={
            isHierarchyLocked
              ? 'Hierarchy is locked. Unlock to reorder or nest cases.'
              : 'Hierarchy is unlocked. Lock to prevent accidental nesting.'
          }
        >
          {isHierarchyLocked ? (
            <Lock className='mr-1 size-3.5' />
          ) : (
            <Unlock className='mr-1 size-3.5' />
          )}
          {isHierarchyLocked ? 'Hierarchy Locked' : 'Hierarchy Unlocked'}
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='h-8 shrink-0'
          onClick={() => {
            void handleSaveDefaults();
          }}
          disabled={isSavingDefaults}
        >
          <Save className='mr-1 size-3.5' />
          {isSavingDefaults ? 'Saving...' : 'Save View'}
        </Button>
      </div>
    </div>
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
        <>
          {renderSortingControls()}
          <Card
            variant='subtle'
            padding='lg'
            className='flex flex-col items-center justify-center border-dashed border-border/60 bg-card/20 py-20 text-center'
          >
            <p className='text-sm font-medium text-muted-foreground'>No cases match your current filters.</p>
          </Card>
        </>
      ) : (
        <div className='relative'>
          {renderSortingControls('mb-3')}
          <FolderTreeViewportV2
            controller={controller}
            canStartDrag={canStartDrag}
            canDrop={canDrop}
            rootDropUi={rootDropUi}
            onNodeDrop={async ({ draggedNodeId, targetId, position, rootDropZone }, ctlr): Promise<void> => {
              if (isHierarchyLocked) return;
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
              isRenaming,
              isDragging,
              isDropTarget,
              dropPosition,
              toggleExpand,
            }): React.JSX.Element => {
              const caseId = fromCaseResolverCaseNodeId(node.id) ?? '';
              const caseFile = caseId ? (filesById.get(caseId) ?? null) : null;
              const caseStatus = caseFile?.caseStatus ?? 'pending';
              const createdAtLabel = formatCaseTimestamp(caseFile?.createdAt);
              const modifiedAtLabel = formatCaseTimestamp(
                caseFile?.updatedAt ?? caseFile?.createdAt
              );
              const caseIdentifierLabel = caseFile?.caseIdentifierId
                ? (caseIdentifierPathById.get(caseFile.caseIdentifierId) ??
                  caseFile.caseIdentifierId)
                : null;
              const isLocked =
                caseFile?.isLocked === true || parseBoolean(node.metadata?.['isLocked']);
              const isStatusToggleDisabled = !caseFile || isLocked;
              const stateClassName = dropPosition === 'before'
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
                        <button
                          type='button'
                          className={
                            `${caseStatus === 'completed'
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                              : 'border-amber-500/40 bg-amber-500/15 text-amber-200'} inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize transition ${isStatusToggleDisabled ? 'cursor-not-allowed opacity-60' : 'hover:brightness-110'}`
                          }
                          disabled={isStatusToggleDisabled}
                          onClick={(event): void => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!caseFile) return;
                            void handleToggleCaseStatus(caseFile.id);
                          }}
                          title={
                            isLocked
                              ? 'Locked cases cannot be status-toggled from the list.'
                              : 'Click to toggle status'
                          }
                        >
                          {caseStatus}
                        </button>
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
                          handleEditCase(caseFile);
                        }}
                      >
                      Edit
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
          <button
            type='button'
            className='absolute bottom-2 right-2 z-20 inline-flex size-6 items-center justify-center rounded-full border border-border bg-muted/80 text-[11px] font-semibold lowercase text-gray-300 shadow-sm transition hover:bg-muted hover:text-white'
            title='Open master tree instance settings'
            aria-label='Open master tree instance settings'
            onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
            }}
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.preventDefault();
              event.stopPropagation();
              if (typeof window === 'undefined') return;
              window.location.assign(CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF);
            }}
          >
            m
          </button>
        </div>
      )}
    </StandardDataTablePanel>
  );
});
