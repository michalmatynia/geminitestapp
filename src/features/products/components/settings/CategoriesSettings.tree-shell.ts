'use client';

import { GripVertical } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';

import type { ReorderCategoryPayload } from '@/features/products/api/settings';
import { useReorderCategoryMutation } from '@/features/products/hooks/useProductSettingsQueries';
import {
  resolveFolderTreeIconSet,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { resolveVerticalDropPosition } from '@/shared/utils/drag-drop';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { createCategoryMasterTreeAdapter } from './category-master-tree-adapter';
import type { CategoryTreeNodeRuntimeContextValue } from './CategoryTreeNodeRuntimeContext';
import { canStartCategoryDrag } from './CategoriesSettings.drag';
import { createReorderToastContext } from './CategoriesSettings.helpers';

type ToastFn = (message: string, options?: { variant?: 'success' | 'error' | 'info' }) => void;
type MasterFolderTreeShellResult = ReturnType<typeof useMasterFolderTreeViewModel>;

export type CategoriesTreeShell = {
  canStartCategoryDrag: typeof canStartCategoryDrag;
  controller: MasterFolderTreeShellResult['controller'];
  panelCollapsed: boolean;
  resolveCategoryDropPosition: (event: React.DragEvent<HTMLElement>) => 'before' | 'after' | 'inside';
  runtimeValue: CategoryTreeNodeRuntimeContextValue;
  setPanelCollapsed: MasterFolderTreeShellResult['panel']['setCollapsed'];
  tree: MasterFolderTreeShellResult;
};

type CategoriesTreeShellInput = {
  categoryById: Map<string, ProductCategoryWithChildren>;
  handleDelete: (category: ProductCategoryWithChildren) => void;
  handleOpenCreateModal: (parentId?: string | null) => void;
  handleOpenEditModal: (category: ProductCategoryWithChildren) => void;
  masterNodes: MasterTreeNode[];
  masterRevision: string;
  onRefresh: () => void;
  selectedCatalogId: string | null;
  toast: ToastFn;
};

const useCategoryReorder = ({ onRefresh, toast }: Pick<CategoriesTreeShellInput, 'onRefresh' | 'toast'>):
  ((payload: ReorderCategoryPayload) => Promise<void>) => {
  const reorderCategoryMutation = useReorderCategoryMutation();
  return useCallback(async (payload: ReorderCategoryPayload): Promise<void> => {
    try {
      await reorderCategoryMutation.mutateAsync(payload);
      toast('Category moved successfully', { variant: 'success' });
      onRefresh();
    } catch (error: unknown) {
      logClientCatch(error, createReorderToastContext(payload));
      toast(error instanceof Error ? error.message : 'Failed to move category', { variant: 'error' });
      throw error;
    }
  }, [onRefresh, reorderCategoryMutation, toast]);
};

const useCategoryMasterShell = ({
  masterNodes,
  masterRevision,
  onRefresh,
  selectedCatalogId,
  toast,
}: Pick<
  CategoriesTreeShellInput,
  'masterNodes' | 'masterRevision' | 'onRefresh' | 'selectedCatalogId' | 'toast'
>): MasterFolderTreeShellResult => {
  const applyReorderPayload = useCategoryReorder({ onRefresh, toast });
  const categoryAdapter = useMemo(
    () => createCategoryMasterTreeAdapter({ selectedCatalogId, applyReorderPayload }),
    [applyReorderPayload, selectedCatalogId]
  );
  const initialExpandedNodeIds = useMemo(
    (): string[] => masterNodes.map((node: MasterTreeNode): string => node.id),
    [masterNodes]
  );
  return useMasterFolderTreeViewModel({
    instance: 'product_categories', nodes: masterNodes,
    initiallyExpandedNodeIds: initialExpandedNodeIds,
    externalRevision: masterRevision, adapter: categoryAdapter,
  });
};

const useCategoryDropPosition = (): CategoriesTreeShell['resolveCategoryDropPosition'] =>
  useCallback((event: React.DragEvent<HTMLElement>): 'before' | 'after' | 'inside' => {
    const targetRect = event.currentTarget.getBoundingClientRect();
    return resolveVerticalDropPosition(event.clientY, targetRect, { thresholdPx: 8 }) ?? 'inside';
  }, []);

const useExpandSelectedCatalogTree = ({
  expandAll,
  selectedCatalogId,
}: {
  expandAll: () => void;
  selectedCatalogId: string | null;
}): void => {
  useEffect((): void => {
    if (selectedCatalogId === null || selectedCatalogId.length === 0) return;
    expandAll();
  }, [expandAll, selectedCatalogId]);
};

const useCategoryRuntimeValue = ({
  categoryById,
  handleDelete,
  handleOpenCreateModal,
  handleOpenEditModal,
  shell,
}: Pick<
  CategoriesTreeShellInput,
  'categoryById' | 'handleDelete' | 'handleOpenCreateModal' | 'handleOpenEditModal'
> & {
  shell: MasterFolderTreeShellResult;
}): CategoryTreeNodeRuntimeContextValue => {
  const { DragHandleIcon } = useMemo(
    () => resolveFolderTreeIconSet(shell.appearance.resolveIcon, {
      DragHandleIcon: { slot: 'dragHandle', fallback: GripVertical, fallbackId: 'GripVertical' },
    }),
    [shell.appearance.resolveIcon]
  );
  return useMemo((): CategoryTreeNodeRuntimeContextValue => ({
    categoryById, placeholderClasses: shell.appearance.placeholderClasses, DragHandleIcon,
    onCreateCategory: handleOpenCreateModal, onEditCategory: handleOpenEditModal,
    onDeleteCategory: handleDelete,
  }), [DragHandleIcon, categoryById, handleDelete, handleOpenCreateModal, handleOpenEditModal,
    shell.appearance.placeholderClasses]);
};

export const useCategoriesTreeShell = (input: CategoriesTreeShellInput): CategoriesTreeShell => {
  const shell = useCategoryMasterShell(input);
  useExpandSelectedCatalogTree({
    expandAll: shell.controller.expandAll,
    selectedCatalogId: input.selectedCatalogId,
  });
  const runtimeValue = useCategoryRuntimeValue({ ...input, shell });
  return { canStartCategoryDrag, controller: shell.controller, panelCollapsed: shell.panel.collapsed,
    resolveCategoryDropPosition: useCategoryDropPosition(), runtimeValue, setPanelCollapsed: shell.panel.setCollapsed,
    tree: shell };
};
