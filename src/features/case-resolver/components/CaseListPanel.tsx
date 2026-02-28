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
import { useMasterFolderTreeInstance } from '@/features/foldertree';
import {
  FolderTreeViewportV2,
  applyInternalMasterTreeDrop,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/v2';
import { CaseListSearchPanel } from './list/search';
import { Button, Card, StandardDataTablePanel } from '@/shared/ui';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

import { useAdminCaseResolverCases } from '../context/AdminCaseResolverCasesContext';
import { useAdminCaseResolverCasesState } from '../hooks/useAdminCaseResolverCasesState';
import { CaseFilterPanel } from './CaseFilterPanel';
import { CaseListHeader } from './list/CaseListHeader';

import {
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

/** Thin wrapper that computes per-node derived values so CaseListNodeItem can be memo'd. */
type CaseListNodeItemWrapperProps = FolderTreeViewportRenderNodeInput & {
  filesById: Map<string, CaseResolverFile>;
  caseTagPathById: Map<string, string>;
  caseIdentifierPathById: Map<string, string>;
  caseCategoryPathById: Map<string, string>;
  controller: MasterFolderTreeController;
  handleToggleCaseStatus: (id: string) => Promise<void>;
  heldCaseId: string | null;
  heldCaseFile: CaseResolverFile | null;
  isHierarchyLocked: boolean;
  isHeldCaseAncestorOf: (candidateCaseId: string) => boolean;
  handleToggleHeldCase: (caseId: string) => void;
  handleNestHeldCase: (targetCaseId: string) => void;
  handlePrefetchCase: (id: string) => void;
  handlePrefetchFile: (id: string) => void;
  handleOpenCase: (id: string) => void;
  handleOpenFile: (id: string) => void;
  handleCreateCase: (parentId: string | null) => void;
  handleDeleteCase: (id: string) => void;
  FolderClosedIcon: React.ComponentType<{ className?: string }>;
  FolderOpenIcon: React.ComponentType<{ className?: string }>;
};

const CaseListNodeItemWrapper = memo(function CaseListNodeItemWrapper(
  props: CaseListNodeItemWrapperProps
) {
  const targetCaseId = fromCaseResolverCaseNodeId(props.node.id) ?? '';
  const canShowNestHeldAction =
    Boolean(props.heldCaseId) && targetCaseId.length > 0 && props.heldCaseId !== targetCaseId;
  const canNestHeldHere =
    canShowNestHeldAction &&
    !props.isHierarchyLocked &&
    Boolean(props.heldCaseFile) &&
    props.heldCaseFile?.isLocked !== true &&
    !props.isHeldCaseAncestorOf(targetCaseId);
  const nestHeldDisabledReason = (() => {
    if (!canShowNestHeldAction) return null;
    if (props.isHierarchyLocked) return 'Unlock hierarchy to move held case.';
    if (!props.heldCaseFile) return 'Held case is no longer available.';
    if (props.heldCaseFile.isLocked === true) return 'Held case is locked.';
    if (props.isHeldCaseAncestorOf(targetCaseId))
      return 'Cannot nest held case under its descendant.';
    return null;
  })();
  return (
    <CaseListNodeItem
      {...props}
      canShowNestHeldAction={canShowNestHeldAction}
      canNestHeldHere={canNestHeldHere}
      nestHeldDisabledReason={nestHeldDisabledReason}
    />
  );
});

export const CaseListPanel = memo(function CaseListPanel(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
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
    heldCaseId,
    setHeldCaseId,
    handleToggleHeldCase,
    handleClearHeldCase,
    caseSortBy,
    caseSortOrder,
    setCaseSortBy,
    setCaseSortOrder,
    caseShowNestedContent,
    setCaseShowNestedContent,
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
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

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
    hasPersistedUiState,
  } = useMasterFolderTreeInstance({
    instance: 'case_resolver_cases',
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
      await applyInternalMasterTreeDrop({
        controller: ctlr,
        draggedNodeId,
        targetId,
        position,
        rootDropZone,
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
    (props: FolderTreeViewportRenderNodeInput): React.JSX.Element => (
      <CaseListNodeItemWrapper
        {...props}
        filesById={filesById}
        caseTagPathById={caseTagPathById}
        caseIdentifierPathById={caseIdentifierPathById}
        caseCategoryPathById={caseCategoryPathById}
        controller={controller}
        handleToggleCaseStatus={handleToggleCaseStatus}
        heldCaseId={heldCaseId}
        heldCaseFile={heldCaseFile}
        isHierarchyLocked={isHierarchyLocked}
        isHeldCaseAncestorOf={isHeldCaseAncestorOf}
        handleToggleHeldCase={handleToggleHeldCase}
        handleNestHeldCase={handleNestHeldCaseVoid}
        handlePrefetchCase={handlePrefetchCase}
        handlePrefetchFile={handlePrefetchFile}
        handleOpenCase={handleOpenCase}
        handleOpenFile={handleOpenFile}
        handleCreateCase={handleCreateCaseLocal}
        handleDeleteCase={handleDeleteCase}
        FolderClosedIcon={FolderClosedIcon}
        FolderOpenIcon={FolderOpenIcon}
      />
    ),
    [
      filesById,
      caseTagPathById,
      caseIdentifierPathById,
      caseCategoryPathById,
      controller,
      handleToggleCaseStatus,
      heldCaseId,
      heldCaseFile,
      isHierarchyLocked,
      isHeldCaseAncestorOf,
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
          onPrefetchCase={handlePrefetchCase}
          onPrefetchFile={(file) => {
            handlePrefetchFile(file.id);
          }}
          onOpenCase={handleOpenCase}
          onOpenFile={(file) => {
            handleOpenFile(file.id);
          }}
        />
      ) : isLoading ? (
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
          <FolderTreeViewportV2
            controller={controller}
            enableDnd={!isHierarchyLocked}
            canStartDrag={canStartDrag}
            canDrop={canDrop}
            rootDropUi={rootDropUi}
            onNodeDrop={(input, treeController): void => {
              void handleNodeDrop(input, treeController);
            }}
            renderNode={handleRenderNode}
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
