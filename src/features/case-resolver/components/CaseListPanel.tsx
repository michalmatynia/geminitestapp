/* eslint-disable */
// @ts-nocheck
'use client';

import {
  Folder,
  FolderOpen,
  PlusIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createCaseResolverCasesMasterTreeAdapter } from '@/features/case-resolver/adapter';
import {
  buildMasterCaseNodesFromCaseResolverWorkspace,
  decodeCaseResolverCaseMasterNodeId,
  toCaseResolverCaseNodeId,
} from '@/features/case-resolver/master-tree';
import { useMasterFolderTreeInstance } from '@/features/foldertree';
import {
  FolderTreeViewportV2,
  applyInternalMasterTreeDrop,
} from '@/features/foldertree/v2';
import {
  Button,
  Card,
  StandardDataTablePanel,
} from '@/shared/ui';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

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
import { CaseListSorting } from './list/sections/CaseListSorting';
import { CaseListNodeItem } from './list/sections/CaseListNodeItem';

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
      router.push(buildCaseResolverCaseHref(caseId));
    },
    [router]
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
        isLocked: false,
        isSent: false,
        activeDocumentVersion: 'original',
      });
      setIsCreateCaseModalOpen(true);
    },
    [setCaseDraft, setEditingCaseId, setIsCreateCaseModalOpen]
  );

  const handleEditCaseLocal = useCallback(
    (caseFile: any): void => {
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

  const canStartDrag = useCallback(
    ({ node }): boolean => {
      if (isHierarchyLocked) return false;
      return !parseBoolean(node.metadata?.['isLocked']);
    },
    [isHierarchyLocked]
  );

  const canDrop = useCallback(
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
            handleSaveDefaults={handleSaveDefaults}
            isSavingDefaults={isSavingDefaults}
          />
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
          <CaseListSorting
            caseSortBy={caseSortBy}
            setCaseSortBy={setCaseSortBy}
            caseSortOrder={caseSortOrder}
            setCaseSortOrder={setCaseSortOrder}
            isHierarchyLocked={isHierarchyLocked}
            setIsHierarchyLocked={setIsHierarchyLocked}
            handleSaveDefaults={handleSaveDefaults}
            isSavingDefaults={isSavingDefaults}
            className='mb-3'
          />
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
            renderNode={(props) => (
              <CaseListNodeItem
                {...props}
                filesById={filesById}
                caseTagPathById={caseTagPathById}
                caseIdentifierPathById={caseIdentifierPathById}
                caseCategoryPathById={caseCategoryPathById}
                controller={controller}
                handleToggleCaseStatus={handleToggleCaseStatus}
                handleOpenCase={handleOpenCase}
                handleEditCase={handleEditCaseLocal}
                handleCreateCase={handleCreateCaseLocal}
                handleDeleteCase={handleDeleteCase}
                FolderClosedIcon={FolderClosedIcon}
                FolderOpenIcon={FolderOpenIcon}
              />
            )}
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
