'use client';

import { Folder, FolderOpen, PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createCaseResolverCasesMasterTreeAdapter } from '@/features/case-resolver/adapter';
import {
  buildMasterCaseContentNodesFromCaseResolverWorkspace,
  buildMasterCaseNodesFromCaseResolverWorkspace,
  decodeCaseResolverCaseMasterNodeId,
  fromCaseResolverCaseNodeId,
  toCaseResolverCaseNodeId,
} from '@/features/case-resolver/master-tree';
import {
  FolderTreeViewportV2,
  handleMasterTreeDrop,
  resolveFolderTreeIconSet,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/v2';
import { CaseListSearchPanel } from './list/search';
import {
  Button,
  Card,
  MasterTreeSettingsButton,
  Skeleton,
  StandardDataTablePanel,
} from '@/shared/ui';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';

import {
  useAdminCaseResolverCasesActionsContext,
  useAdminCaseResolverCasesStateContext,
} from '../context/AdminCaseResolverCasesContext';
import { useAdminCaseResolverCasesState } from '../hooks/useAdminCaseResolverCasesState';
import { CaseFilterPanel } from './CaseFilterPanel';
import { CaseListHeader } from './list/CaseListHeader';

import {
  CASE_RESOLVER_CASES_MASTER_INSTANCE,
  CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF,
  buildCaseResolverCaseHref,
  sortCaseTreeNodes,
  parseBoolean,
} from './list/case-list-utils';
import { primeCaseResolverNavigationWorkspace } from '../workspace-persistence';
import { CaseListSorting } from './list/sections/CaseListSorting';
import { CaseListNodeItem } from './list/sections/CaseListNodeItem';
import { CaseListHeldDock } from './list/sections/CaseListHeldDock';
import { useCaseListAutoExpandBootstrap } from './list/hooks/useCaseListAutoExpandBootstrap';
import {
  CaseListNodeRuntimeProvider,
  type CaseListNodeRuntimeContextValue,
} from './list/sections/CaseListNodeRuntimeContext';

const CASE_LIST_LOADING_SKELETON_ROWS = 8;

const CaseListLoadingSkeleton = memo(function CaseListLoadingSkeleton(): React.JSX.Element {
  return (
    <div className='space-y-2 py-2'>
      {Array.from({ length: CASE_LIST_LOADING_SKELETON_ROWS }).map(
        (_, index): React.JSX.Element => (
          <div
            key={`case-list-loading-row-${index}`}
            className='flex items-center gap-3 rounded-md border border-border/50 bg-card/30 px-3 py-2'
          >
            <Skeleton className='size-4 rounded-sm' />
            <Skeleton className='h-4 flex-1 max-w-[420px]' />
            <Skeleton className='h-4 w-24' />
          </div>
        )
      )}
    </div>
  );
});

export const CaseListPanel = memo(function CaseListPanel(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const {
    workspace,
    isLoading,
    casesLoadState,
    casesLoadMessage,
    heldCaseId,
    caseSortBy,
    caseSortOrder,
    caseShowNestedContent,
  } = useAdminCaseResolverCasesStateContext();
  const {
    setIsCreateCaseModalOpen,
    setCaseDraft,
    setEditingCaseId,
    handleDeleteCase,
    handleMoveCase,
    handleReorderCase,
    handleRenameCase,
    handleToggleCaseStatus,
    setHeldCaseId,
    handleToggleHeldCase,
    handleClearHeldCase,
    setCaseSortBy,
    setCaseSortOrder,
    setCaseShowNestedContent,
    handleSaveListViewDefaults,
    handleRefreshWorkspace,
  } = useAdminCaseResolverCasesActionsContext();
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
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const showLoadingSkeleton = isLoading || casesLoadState === 'loading';

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

  const caseSearchOrderById = useMemo((): Map<string, number> => {
    const siblingsByParentId = new Map<string | null, MasterTreeNode[]>();
    baseCaseNodes.forEach((node: MasterTreeNode): void => {
      const caseId = fromCaseResolverCaseNodeId(node.id);
      if (!caseId) return;
      const parentId = node.parentId ?? null;
      const siblings = siblingsByParentId.get(parentId) ?? [];
      siblings.push(node);
      siblingsByParentId.set(parentId, siblings);
    });

    siblingsByParentId.forEach((siblings: MasterTreeNode[]): void => {
      siblings.sort((left: MasterTreeNode, right: MasterTreeNode): number => {
        if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      });
    });

    const ordered = new Map<string, number>();
    let nextIndex = 0;
    const walk = (parentId: string | null): void => {
      const siblings = siblingsByParentId.get(parentId) ?? [];
      siblings.forEach((node: MasterTreeNode): void => {
        const caseId = fromCaseResolverCaseNodeId(node.id);
        if (caseId && !ordered.has(caseId)) {
          ordered.set(caseId, nextIndex);
          nextIndex += 1;
        }
        walk(node.id);
      });
    };
    walk(null);
    return ordered;
  }, [baseCaseNodes]);

  const isSearchActive = treeSearchQuery.trim().length > 0;

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
    return filteredCases.slice(startIndex, startIndex + pageSize).map((file) => file.id);
  }, [filteredCases, page, pageSize]);

  const parentCaseIdByCaseId = useMemo((): Map<string, string | null> => {
    const map = new Map<string, string | null>();
    files.forEach((file): void => {
      const parentCaseId = file.parentCaseId?.trim() ?? '';
      map.set(file.id, parentCaseId.length > 0 ? parentCaseId : null);
    });
    return map;
  }, [files]);

  const heldCaseFile = useMemo(
    () => (heldCaseId ? (filesById.get(heldCaseId) ?? null) : null),
    [filesById, heldCaseId]
  );

  useEffect((): void => {
    if (!heldCaseId) return;
    if (filesById.has(heldCaseId)) return;
    setHeldCaseId(null);
  }, [filesById, heldCaseId, setHeldCaseId]);

  const isHeldCaseAncestorOf = useCallback(
    (candidateCaseId: string): boolean => {
      const normalizedCandidate = candidateCaseId.trim();
      const normalizedHeldCaseId = heldCaseId?.trim() ?? '';
      if (!normalizedCandidate || !normalizedHeldCaseId) return false;
      let currentCaseId: string | null = normalizedCandidate;
      const visited = new Set<string>();
      while (currentCaseId && !visited.has(currentCaseId)) {
        if (currentCaseId === normalizedHeldCaseId) return true;
        visited.add(currentCaseId);
        currentCaseId = parentCaseIdByCaseId.get(currentCaseId) ?? null;
      }
      return false;
    },
    [heldCaseId, parentCaseIdByCaseId]
  );

  const handleNestHeldCase = useCallback(
    async (targetCaseId: string): Promise<void> => {
      const normalizedTargetCaseId = targetCaseId.trim();
      const normalizedHeldCaseId = heldCaseId?.trim() ?? '';
      if (!normalizedTargetCaseId || !normalizedHeldCaseId) return;
      if (normalizedTargetCaseId === normalizedHeldCaseId) return;
      if (isHierarchyLocked) return;
      const heldCase = filesById.get(normalizedHeldCaseId);
      if (!heldCase || heldCase.isLocked === true) return;
      if (isHeldCaseAncestorOf(normalizedTargetCaseId)) return;
      await handleMoveCase(normalizedHeldCaseId, normalizedTargetCaseId);
    },
    [filesById, handleMoveCase, heldCaseId, isHeldCaseAncestorOf, isHierarchyLocked]
  );

  const visibleCaseIdSet = useMemo((): Set<string> => {
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
    const normalizedHeldCaseId = heldCaseId?.trim() ?? '';
    if (normalizedHeldCaseId.length > 0) {
      includeWithAncestors(normalizedHeldCaseId);
    }
    return scoped;
  }, [heldCaseId, pagedCaseIds, parentCaseIdByCaseId]);

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

  const visibleCaseNodes = useMemo((): MasterTreeNode[] => {
    if (!isCaseSubsetVisible) return baseCaseNodes;
    return baseCaseNodes.filter((node: MasterTreeNode): boolean =>
      visibleCaseNodeIdSet.has(node.id)
    );
  }, [baseCaseNodes, isCaseSubsetVisible, visibleCaseNodeIdSet]);

  const nestedCaseContentNodes = useMemo((): MasterTreeNode[] => {
    if (!caseShowNestedContent) return [];
    return buildMasterCaseContentNodesFromCaseResolverWorkspace({
      workspace,
      includeCaseIds: isCaseSubsetVisible ? visibleCaseIdSet : null,
    });
  }, [caseShowNestedContent, isCaseSubsetVisible, visibleCaseIdSet, workspace]);

  const masterNodes = useMemo((): MasterTreeNode[] => {
    if (!caseShowNestedContent) return visibleCaseNodes;
    return [...visibleCaseNodes, ...nestedCaseContentNodes];
  }, [caseShowNestedContent, nestedCaseContentNodes, visibleCaseNodes]);

  const autoExpandedNodeIds = useMemo((): string[] => {
    if (!isCaseSubsetVisible) return [];
    return masterNodes
      .filter(
        (node: MasterTreeNode): boolean => node.type === 'folder' && node.kind === 'case_entry'
      )
      .map((node: MasterTreeNode): string => node.id);
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
          await adapterOperationsRef.current.handleMoveCase(
            caseId,
            targetParentCaseId,
            targetIndex
          );
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
    panel: { hasPersistedState: hasPersistedUiState },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: CASE_RESOLVER_CASES_MASTER_INSTANCE,
    nodes: masterNodes,
    adapter,
  });

  useCaseListAutoExpandBootstrap({
    isUiStateReady: !settingsStore.isLoading && !settingsStore.isFetching,
    hasPersistedUiState,
    isCaseSubsetVisible,
    autoExpandedNodeIds,
    setExpandedNodeIds: controller.setExpandedNodeIds,
  });

  const { FolderClosedIcon, FolderOpenIcon } = useMemo(
    () =>
      resolveFolderTreeIconSet(resolveIcon, {
        FolderClosedIcon: {
          slot: 'folderClosed',
          kind: 'case_entry',
          fallback: Folder,
          fallbackId: 'Folder',
        },
        FolderOpenIcon: {
          slot: 'folderOpen',
          kind: 'case_entry',
          fallback: FolderOpen,
          fallbackId: 'FolderOpen',
        },
      }),
    [resolveIcon]
  );

  const handleOpenCase = useCallback(
    (caseId: string): void => {
      primeCaseResolverNavigationWorkspace(workspace);
      router.push(buildCaseResolverCaseHref(caseId));
    },
    [router, workspace]
  );

  const prefetchedCaseHrefSetRef = useRef<Set<string>>(new Set());

  const prefetchCaseResolverHref = useCallback(
    (fileId: string): void => {
      const normalizedFileId = fileId.trim();
      if (!normalizedFileId) return;
      const href = buildCaseResolverCaseHref(normalizedFileId);
      if (prefetchedCaseHrefSetRef.current.has(href)) return;
      prefetchedCaseHrefSetRef.current.add(href);
      router.prefetch(href);
    },
    [router]
  );

  const handlePrefetchCase = useCallback(
    (caseId: string): void => {
      prefetchCaseResolverHref(caseId);
    },
    [prefetchCaseResolverHref]
  );

  const handlePrefetchFile = useCallback(
    (fileId: string): void => {
      prefetchCaseResolverHref(fileId);
    },
    [prefetchCaseResolverHref]
  );

  useEffect((): void => {
    if (!heldCaseFile) return;
    handlePrefetchCase(heldCaseFile.id);
  }, [handlePrefetchCase, heldCaseFile]);

  const handleOpenFile = useCallback(
    (fileId: string): void => {
      primeCaseResolverNavigationWorkspace(workspace);
      router.push(buildCaseResolverCaseHref(fileId));
    },
    [router, workspace]
  );

  const handleCreateCaseLocal = useCallback(
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
        happeningDate: null,
        isLocked: false,
        isSent: false,
        activeDocumentVersion: 'original',
      });
      setIsCreateCaseModalOpen(true);
    },
    [setCaseDraft, setEditingCaseId, setIsCreateCaseModalOpen]
  );

  const canStartDrag = useCallback(
    ({ node }: { node: FolderTreeViewportRenderNodeInput['node'] }): boolean => {
      if (isHierarchyLocked) return false;
      if (!decodeCaseResolverCaseMasterNodeId(node.id)) return false;
      return !parseBoolean(node.metadata?.['isLocked']);
    },
    [isHierarchyLocked]
  );

  const canDrop = useCallback(
    ({
      draggedNodeId,
      targetId,
      defaultAllowed,
    }: {
      draggedNodeId: string;
      targetId: string | null;
      defaultAllowed: boolean;
    }): boolean => {
      if (isHierarchyLocked) return false;
      if (!defaultAllowed) return false;
      const dragged = decodeCaseResolverCaseMasterNodeId(draggedNodeId);
      if (!dragged) return false;
      if (targetId === null) return true;
      return decodeCaseResolverCaseMasterNodeId(targetId) !== null;
    },
    [isHierarchyLocked]
  );

  const handleNodeDrop = useCallback(
    async (
      {
        draggedNodeId,
        targetId,
        position,
        rootDropZone,
      }: {
        draggedNodeId: string;
        targetId: string | null;
        position: 'inside' | 'before' | 'after';
        rootDropZone?: 'top' | 'bottom';
      },
      ctlr: MasterFolderTreeController
    ): Promise<void> => {
      if (isHierarchyLocked) return;
      await handleMasterTreeDrop({
        input: {
          draggedNodeId,
          targetId,
          position,
          rootDropZone,
        },
        controller: ctlr,
      });
    },
    [isHierarchyLocked]
  );

  const handleNestHeldCaseVoid = useCallback(
    (caseId: string): void => {
      void handleNestHeldCase(caseId);
    },
    [handleNestHeldCase]
  );

  const handleRenderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.JSX.Element => {
      const targetCaseId = fromCaseResolverCaseNodeId(input.node.id) ?? '';
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
        if (isHeldCaseAncestorOf(targetCaseId))
          return 'Cannot nest held case under its descendant.';
        return null;
      })();

      return (
        <CaseListNodeItem
          node={input.node}
          depth={input.depth}
          hasChildren={input.hasChildren}
          isExpanded={input.isExpanded}
          isRenaming={input.isRenaming}
          isDragging={input.isDragging}
          isDropTarget={input.isDropTarget}
          dropPosition={input.dropPosition}
          toggleExpand={input.toggleExpand}
          heldCaseId={heldCaseId}
          canShowNestHeldAction={canShowNestHeldAction}
          canNestHeldHere={canNestHeldHere}
          nestHeldDisabledReason={nestHeldDisabledReason}
        />
      );
    },
    [heldCaseId, heldCaseFile, isHierarchyLocked, isHeldCaseAncestorOf]
  );

  const caseListNodeRuntimeValue = useMemo(
    (): CaseListNodeRuntimeContextValue => ({
      filesById,
      caseTagPathById,
      caseIdentifierPathById,
      caseCategoryPathById,
      renameDraft: controller.renameDraft,
      onUpdateRenameDraft: (value: string): void => {
        controller.updateRenameDraft(value);
      },
      onCommitRename: (): void => {
        void controller.commitRename();
      },
      onCancelRename: (): void => {
        controller.cancelRename();
      },
      handleToggleCaseStatus,
      handleToggleHeldCase,
      handleNestHeldCase: handleNestHeldCaseVoid,
      handlePrefetchCase,
      handlePrefetchFile,
      handleOpenCase,
      handleOpenFile,
      handleCreateCase: handleCreateCaseLocal,
      handleDeleteCase,
      FolderClosedIcon,
      FolderOpenIcon,
    }),
    [
      filesById,
      caseTagPathById,
      caseIdentifierPathById,
      caseCategoryPathById,
      controller,
      controller.renameDraft,
      handleToggleCaseStatus,
      handleToggleHeldCase,
      handleNestHeldCaseVoid,
      handlePrefetchCase,
      handlePrefetchFile,
      handleOpenCase,
      handleOpenFile,
      handleCreateCaseLocal,
      handleDeleteCase,
      FolderClosedIcon,
      FolderOpenIcon,
    ]
  );

  return (
    <StandardDataTablePanel
      header={
        <CaseListHeader
          onCreateCase={() => {
            handleCreateCaseLocal(null);
          }}
          filtersContent={<CaseFilterPanel />}
          filteredCount={filteredCases.length}
          totalCount={files.length}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchQuery={treeSearchQuery}
          onSearchChange={setTreeSearchQuery}
        />
      }
      columns={[]}
      data={[]}
      isLoading={false}
      contentClassName='space-y-3'
    >
      {isSearchActive ? (
        <CaseListSearchPanel
          workspace={workspace}
          identifierLabelById={caseIdentifierPathById}
          query={treeSearchQuery}
          caseOrderById={caseSearchOrderById}
          onPrefetchCase={handlePrefetchCase}
          onPrefetchFile={(file) => {
            handlePrefetchFile(file.id);
          }}
          onOpenCase={handleOpenCase}
          onOpenFile={(file) => {
            handleOpenFile(file.id);
          }}
        />
      ) : showLoadingSkeleton ? (
        <CaseListLoadingSkeleton />
      ) : casesLoadState === 'no_record' ? (
        <Card
          variant='subtle'
          padding='lg'
          className='flex flex-col items-center justify-center border-dashed border-border/60 bg-card/20 py-20 text-center'
        >
          <FolderOpen className='mb-4 size-10 text-muted-foreground/20' />
          <p className='text-sm font-medium text-muted-foreground'>No workspace data found.</p>
          <p className='mt-2 max-w-xl text-xs text-muted-foreground/80'>
            {casesLoadMessage || 'Case Resolver workspace key is missing.'}
          </p>
          <div className='mt-4 flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void handleRefreshWorkspace();
              }}
            >
              Retry
            </Button>
            <Button
              variant='outline'
              size='icon-lg'
              aria-label='Create new case'
              onClick={() => {
                handleCreateCaseLocal(null);
              }}
            >
              <PlusIcon className='h-6 w-6' />
            </Button>
          </div>
        </Card>
      ) : casesLoadState === 'unavailable' ? (
        <Card
          variant='subtle'
          padding='lg'
          className='flex flex-col items-center justify-center border-dashed border-border/60 bg-card/20 py-20 text-center'
        >
          <p className='text-sm font-medium text-muted-foreground'>
            Could not load cases workspace.
          </p>
          <p className='mt-2 max-w-xl text-xs text-muted-foreground/80'>
            {casesLoadMessage || 'Retry loading workspace data.'}
          </p>
          <Button
            variant='outline'
            size='sm'
            className='mt-4'
            onClick={() => {
              void handleRefreshWorkspace();
            }}
          >
            Retry
          </Button>
        </Card>
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
              handleCreateCaseLocal(null);
            }}
          >
            <PlusIcon className='h-6 w-6' />
          </Button>
        </Card>
      ) : filteredCases.length === 0 ? (
        <>
          <CaseListSorting
            caseSortBy={caseSortBy}
            setCaseSortBy={setCaseSortBy}
            caseSortOrder={caseSortOrder}
            setCaseSortOrder={setCaseSortOrder}
            isHierarchyLocked={isHierarchyLocked}
            setIsHierarchyLocked={setIsHierarchyLocked}
            caseShowNestedContent={caseShowNestedContent}
            setCaseShowNestedContent={setCaseShowNestedContent}
            handleSaveDefaults={handleSaveDefaults}
            isSavingDefaults={isSavingDefaults}
          />
          <CaseListHeldDock
            heldCaseFile={heldCaseFile}
            isHierarchyLocked={isHierarchyLocked}
            onPrefetchCase={handlePrefetchCase}
            onOpenCase={handleOpenCase}
            onClearHeldCase={handleClearHeldCase}
          />
          <Card
            variant='subtle'
            padding='lg'
            className='flex flex-col items-center justify-center border-dashed border-border/60 bg-card/20 py-20 text-center'
          >
            <p className='text-sm font-medium text-muted-foreground'>
              No cases match your current filters.
            </p>
          </Card>
        </>
      ) : (
        <div className='relative'>
          <CaseListSorting
            caseSortBy={caseSortBy}
            setCaseSortBy={setCaseSortBy}
            caseSortOrder={caseSortOrder}
            setCaseSortOrder={setCaseSortOrder}
            isHierarchyLocked={isHierarchyLocked}
            setIsHierarchyLocked={setIsHierarchyLocked}
            caseShowNestedContent={caseShowNestedContent}
            setCaseShowNestedContent={setCaseShowNestedContent}
            handleSaveDefaults={handleSaveDefaults}
            isSavingDefaults={isSavingDefaults}
            className='mb-3'
          />
          <CaseListHeldDock
            heldCaseFile={heldCaseFile}
            isHierarchyLocked={isHierarchyLocked}
            onPrefetchCase={handlePrefetchCase}
            onOpenCase={handleOpenCase}
            onClearHeldCase={handleClearHeldCase}
          />
          <CaseListNodeRuntimeProvider value={caseListNodeRuntimeValue}>
            <FolderTreeViewportV2
              controller={controller}
              scrollToNodeRef={scrollToNodeRef}
              enableDnd={!isHierarchyLocked}
              canStartDrag={canStartDrag}
              canDrop={canDrop}
              rootDropUi={rootDropUi}
              onNodeDrop={(input, treeController): void => {
                void handleNodeDrop(input, treeController);
              }}
              renderNode={handleRenderNode}
            />
          </CaseListNodeRuntimeProvider>
          <MasterTreeSettingsButton
            instance={CASE_RESOLVER_CASES_MASTER_INSTANCE}
            href={CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF}
          />
        </div>
      )}
    </StandardDataTablePanel>
  );
});
