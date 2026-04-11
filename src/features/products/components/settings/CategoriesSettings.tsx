'use client';

import { ChevronLeft, ChevronRight, GripVertical, Plus } from 'lucide-react';
import React, { useState, useCallback, useMemo, useEffect } from 'react';

import {
  FolderTreeViewportV2,
  resolveFolderTreeIconSet,
  useMasterFolderTreeShell,
} from '@/shared/lib/foldertree/public';
import type { ReorderCategoryPayload } from '@/features/products/api/settings';
import { useProductCategoryTree } from '@/features/products/hooks/useCategoryQueries';
import {
  useSaveCategoryMutation,
  useDeleteCategoryMutation,
  useReorderCategoryMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductCategoryWithChildren, ProductCategory } from '@/shared/contracts/products/categories';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState, CompactEmptyState } from '@/shared/ui/empty-state';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { useToast } from '@/shared/ui/toast';

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { resolveVerticalDropPosition } from '@/shared/utils/drag-drop';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { buildMasterNodesFromCategoryTree } from './category-master-tree';
import { createCategoryMasterTreeAdapter } from './category-master-tree-adapter';
import { CategoryForm } from './CategoryForm';
import { CategoryFormProvider, type CategoryFormData } from './CategoryFormContext';
import { CategoryTreeNodeRenderer } from './CategoryTreeNodeRenderer';
import {
  CategoryTreeNodeRuntimeProvider,
  type CategoryTreeNodeRuntimeContextValue,
} from './CategoryTreeNodeRuntimeContext';
import { useProductSettingsCategoriesContext } from './ProductSettingsContext';

const cloneCategoryTree = (nodes: ProductCategoryWithChildren[]): ProductCategoryWithChildren[] =>
  nodes.map(
    (node: ProductCategoryWithChildren): ProductCategoryWithChildren => ({
      ...node,
      children: cloneCategoryTree(node.children),
    })
  );

export function CategoriesSettings(): React.JSX.Element {
  const {
    loadingCategories: loading,
    categories,
    catalogs,
    selectedCategoryCatalogId: selectedCatalogId,
    onCategoryCatalogChange: onCatalogChange,
    onRefreshCategories: onRefresh,
  } = useProductSettingsCategoriesContext();

  const { toast } = useToast();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategoryWithChildren | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    namePl: '',
    description: '',
    color: '#10b981',
    parentId: null,
    catalogId: '',
  });
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategoryWithChildren | null>(
    null
  );

  const saveCategoryMutation = useSaveCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const reorderCategoryMutation = useReorderCategoryMutation();
  const reorderCategory = reorderCategoryMutation.mutateAsync;

  const [modalCatalogId, setModalCatalogId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<ProductCategoryWithChildren[]>(() =>
    cloneCategoryTree(categories)
  );

  const { data: fetchedModalCategories, isLoading: modalLoadingCategories } =
    useProductCategoryTree(modalCatalogId || undefined);

  useEffect((): void => {
    setTreeData(cloneCategoryTree(categories));
  }, [categories]);

  const modalCategories = useMemo(() => {
    if (modalCatalogId === selectedCatalogId) return treeData;
    return fetchedModalCategories || [];
  }, [modalCatalogId, selectedCatalogId, treeData, fetchedModalCategories]);

  const masterNodes = useMemo(
    (): MasterTreeNode[] => buildMasterNodesFromCategoryTree(treeData),
    [treeData]
  );
  const initialExpandedNodeIds = useMemo(
    () => masterNodes.map((node: MasterTreeNode) => node.id),
    [masterNodes]
  );
  const masterRevision = useMemo(
    () =>
      masterNodes
        .map((node: MasterTreeNode) => `${node.id}:${node.parentId ?? 'root'}:${node.sortOrder}`)
        .join('|'),
    [masterNodes]
  );
  const applyCategoryReorderPayload = useCallback(
    async (payload: ReorderCategoryPayload): Promise<void> => {
      try {
        await reorderCategory(payload);
        toast('Category moved successfully', { variant: 'success' });
        onRefresh();
      } catch (error) {
        logClientCatch(error, {
          source: 'CategoriesSettings',
          action: 'applyCategoryReorderPayload',
          payload,
        });
        const message: string = error instanceof Error ? error.message : 'Failed to move category';
        toast(message, { variant: 'error' });
        throw error;
      }
    },
    [onRefresh, reorderCategory, toast]
  );
  const categoryAdapter = useMemo(
    () =>
      createCategoryMasterTreeAdapter({
        selectedCatalogId,
        applyReorderPayload: applyCategoryReorderPayload,
      }),
    [applyCategoryReorderPayload, selectedCatalogId]
  );
  const {
    appearance: { placeholderClasses, rootDropUi, resolveIcon },
    controller,
    panel: { collapsed: panelCollapsed, setCollapsed: setPanelCollapsed },
  } = useMasterFolderTreeShell({
    instance: 'product_categories',
    nodes: masterNodes,
    initiallyExpandedNodeIds: initialExpandedNodeIds,
    externalRevision: masterRevision,
    adapter: categoryAdapter,
  });
  const { expandAll } = controller;

  useEffect((): void => {
    if (!selectedCatalogId) return;
    expandAll();
  }, [expandAll, selectedCatalogId]);

  const handleOpenCreateModal = useCallback(
    (parentId: string | null = null): void => {
      if (!selectedCatalogId) {
        toast('Please select a catalog first', { variant: 'error' });
        return;
      }
      setEditingCategory(null);
      setFormData({
        name: '',
        namePl: '',
        description: '',
        color: '#10b981',
        parentId,
        catalogId: selectedCatalogId,
      });
      setModalCatalogId(selectedCatalogId);
      setShowModal(true);
    },
    [selectedCatalogId, toast]
  );

  const handleOpenEditModal = useCallback((category: ProductCategoryWithChildren): void => {
    setEditingCategory(category);
    setFormData({
      name: category.name_en ?? category.name,
      namePl: category.name_pl ?? '',
      description: category.description || '',
      color: category.color || '#10b981',
      parentId: category.parentId ?? null,
      catalogId: category.catalogId,
    });
    setModalCatalogId(category.catalogId);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback((category: ProductCategoryWithChildren): void => {
    setCategoryToDelete(category);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!categoryToDelete) return;
    try {
      await deleteCategoryMutation.mutateAsync({
        id: categoryToDelete.id,
        catalogId: selectedCatalogId,
      });
      toast('Category deleted successfully', { variant: 'success' });
      onRefresh();
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'CategoriesSettings',
        action: 'deleteCategory',
        categoryId: categoryToDelete.id,
      });
      const message: string = error instanceof Error ? error.message : 'Failed to delete category';
      toast(message, { variant: 'error' });
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast('Category name is required', { variant: 'error' });
      return;
    }

    const targetCatalogId: string | undefined =
      formData.catalogId || selectedCatalogId || undefined;
    if (!targetCatalogId && !editingCategory) {
      toast('Please select a catalog first', { variant: 'error' });
      return;
    }

    try {
      const payload: Partial<ProductCategory> = {
        name: formData.name.trim(),
        name_pl: formData.namePl.trim() || null,
        description: formData.description.trim() || null,
        color: formData.color,
        parentId: formData.parentId ?? null,
        catalogId: targetCatalogId!,
      };

      await saveCategoryMutation.mutateAsync({
        id: editingCategory?.id,
        data: payload,
      });

      toast(editingCategory ? 'Category updated successfully' : 'Category created successfully', {
        variant: 'success',
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'CategoriesSettings',
        action: 'saveCategory',
        categoryId: editingCategory?.id,
      });
      const message: string = error instanceof Error ? error.message : 'Failed to save category';
      toast(message, { variant: 'error' });
    }
  };

  const selectedCatalog: Catalog | undefined = catalogs.find(
    (c: Catalog): boolean => c.id === selectedCatalogId
  );
  const modalCatalog: Catalog | undefined = catalogs.find(
    (c: Catalog): boolean => c.id === modalCatalogId
  );
  const catalogOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      catalogs.map((catalog: Catalog) => ({
        value: catalog.id,
        label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
      })),
    [catalogs]
  );

  const findCategory = useCallback(
    (cats: ProductCategoryWithChildren[], id: string): ProductCategoryWithChildren | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        const found: ProductCategoryWithChildren | null = findCategory(cat.children, id);
        if (found) return found;
      }
      return null;
    },
    []
  );

  const categoryById = useMemo((): Map<string, ProductCategoryWithChildren> => {
    const map = new Map<string, ProductCategoryWithChildren>();
    const walk = (nodes: ProductCategoryWithChildren[]): void => {
      nodes.forEach((node: ProductCategoryWithChildren) => {
        map.set(node.id, node);
        if (node.children.length > 0) walk(node.children);
      });
    };
    walk(treeData);
    return map;
  }, [treeData]);

  const collectDescendantIds = useCallback((cat: ProductCategoryWithChildren): string[] => {
    const ids: string[] = [];
    for (const child of cat.children) {
      ids.push(child.id, ...collectDescendantIds(child));
    }
    return ids;
  }, []);

  const categoryOptions: { id: string; name: string; level: number }[] = useMemo((): {
    id: string;
    name: string;
    level: number;
  }[] => {
    const flatten = (
      cats: ProductCategoryWithChildren[],
      level: number = 0
    ): { id: string; name: string; level: number }[] => {
      const items: { id: string; name: string; level: number }[] = [];
      for (const cat of cats) {
        items.push({ id: cat.id, name: cat.name, level });
        if (cat.children.length) {
          items.push(...flatten(cat.children, level + 1));
        }
      }
      return items;
    };
    return flatten(modalCategories);
  }, [modalCategories]);

  const excludedParentIds: Set<string> = useMemo((): Set<string> => {
    if (!editingCategory) return new Set<string>();
    if (modalCatalogId && editingCategory.catalogId !== modalCatalogId) {
      return new Set<string>();
    }
    const current: ProductCategoryWithChildren | null = findCategory(
      modalCategories,
      editingCategory.id
    );
    if (!current) return new Set<string>();
    return new Set([editingCategory.id, ...collectDescendantIds(current)]);
  }, [editingCategory, modalCatalogId, modalCategories, findCategory, collectDescendantIds]);

  const parentOptions: { id: string; name: string; level: number }[] = useMemo(
    (): { id: string; name: string; level: number }[] =>
      categoryOptions.filter((opt: { id: string }): boolean => !excludedParentIds.has(opt.id)),
    [categoryOptions, excludedParentIds]
  );

  useEffect((): void => {
    if (!showModal) return;
    if (!formData.parentId) return;
    const stillValid: boolean = parentOptions.some(
      (opt: { id: string }): boolean => opt.id === formData.parentId
    );
    if (!stillValid) {
      setFormData((prev: CategoryFormData) => ({ ...prev, parentId: null }));
    }
  }, [showModal, parentOptions, formData.parentId]);

  const { DragHandleIcon } = useMemo(
    () =>
      resolveFolderTreeIconSet(resolveIcon, {
        DragHandleIcon: {
          slot: 'dragHandle',
          fallback: GripVertical,
          fallbackId: 'GripVertical',
        },
      }),
    [resolveIcon]
  );

  const resolveCategoryDropPosition = useCallback(
    (event: React.DragEvent<HTMLElement>): 'before' | 'after' | 'inside' => {
      const targetRect = event.currentTarget.getBoundingClientRect();
      const edge = resolveVerticalDropPosition(event.clientY, targetRect, {
        thresholdPx: 8,
      });
      return edge ?? 'inside';
    },
    []
  );

  const canStartCategoryDrag = useCallback(
    (input: {
      node: MasterTreeNode;
      event: React.DragEvent<HTMLDivElement>;
    }): boolean => {
      const { event } = input;
      const target = event.target;
      const eventTarget = target instanceof Element ? target : null;
      const pointerElement =
        typeof document !== 'undefined'
          ? document.elementFromPoint(event.clientX, event.clientY)
          : null;

      const matchesSelector = (element: Element | null, selector: string): boolean =>
        Boolean(element?.closest(selector));

      if (
        matchesSelector(eventTarget, '[data-master-tree-drag-handle="category"]') ||
        matchesSelector(pointerElement, '[data-master-tree-drag-handle="category"]')
      ) {
        return true;
      }

      if (
        matchesSelector(
          eventTarget,
          'button,[role="button"],input,textarea,select,a,[data-master-tree-no-drag="true"]'
        ) ||
        matchesSelector(
          pointerElement,
          'button,[role="button"],input,textarea,select,a,[data-master-tree-no-drag="true"]'
        )
      ) {
        return false;
      }

      return (
        matchesSelector(eventTarget, '[data-master-tree-drag-surface="category"]') ||
        matchesSelector(pointerElement, '[data-master-tree-drag-surface="category"]')
      );
    },
    []
  );

  const categoryTreeNodeRuntimeValue = useMemo(
    (): CategoryTreeNodeRuntimeContextValue => ({
      categoryById,
      placeholderClasses,
      DragHandleIcon,
      onCreateCategory: handleOpenCreateModal,
      onEditCategory: handleOpenEditModal,
      onDeleteCategory: handleDelete,
    }),
    [
      categoryById,
      placeholderClasses,
      DragHandleIcon,
      handleOpenCreateModal,
      handleOpenEditModal,
      handleDelete,
    ]
  );

  return (
    <>
      <div className='space-y-5'>
        {/* Catalog Selector */}
        <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
          <p className='text-sm font-semibold text-white mb-3'>Select Catalog</p>
          <p className='text-xs text-gray-400 mb-3'>
            Each catalog has its own category tree. Select a catalog to manage its categories.
          </p>
          <div className='w-full max-w-xs'>
            <SelectSimple
              size='sm'
              value={selectedCatalogId || ''}
              onValueChange={onCatalogChange}
              options={catalogOptions}
              placeholder='Select a catalog...'
              ariaLabel='Catalog'
             title='Select a catalog...'/>
          </div>
        </Card>

        {/* Category Tree */}
        {selectedCatalogId && (
          <>
            <div className='flex justify-start'>
              <Button
                onClick={(): void => handleOpenCreateModal(null)}
                variant='solid'
                className='flex items-center gap-2'
              >
                <Plus className='size-4' />
                Add Category
              </Button>
            </div>

            <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
              <p className='text-sm font-semibold text-white mb-4'>
                Category Tree for &quot;{selectedCatalog?.name}&quot;
              </p>

              {loading && treeData.length === 0 ? (
                <div className='space-y-2 p-4'>
                  <Skeleton className='h-8 w-full' />
                  <Skeleton className='h-8 w-full' />
                  <Skeleton className='h-8 w-full' />
                </div>
              ) : treeData.length === 0 ? (
                <EmptyState
                  title='No categories yet'
                  description='Categories help you organize products into a hierarchical tree.'
                  action={
                    <Button onClick={(): void => handleOpenCreateModal(null)} variant='outline'>
                      <Plus className='size-4 mr-2' />
                      Add Category
                    </Button>
                  }
                />
              ) : (
                <FolderTreePanel
                  className='relative rounded-md border border-border bg-gray-900 p-2'
                  bodyClassName='space-y-0.5'
                  masterInstance='product_categories'
                >
                  <div className='mb-2 flex items-center justify-end'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-7 px-2 text-xs'
                      onClick={(): void => setPanelCollapsed(!panelCollapsed)}
                      title={panelCollapsed ? 'Show category tree' : 'Collapse category tree'}
                      aria-expanded={!panelCollapsed}
                    >
                      {panelCollapsed ? (
                        <>
                          <ChevronRight className='mr-1 size-3.5 -scale-x-100' aria-hidden='true' />
                          Show Tree
                        </>
                      ) : (
                        <>
                          <ChevronLeft className='mr-1 size-3.5' aria-hidden='true' />
                          Collapse
                        </>
                      )}
                    </Button>
                  </div>
                  {panelCollapsed ? (
                    <CompactEmptyState
                      title='Tree Collapsed'
                      description='Category tree is collapsed.'
                      className='bg-card/30 border-dashed border-border/70 py-4'
                     />
                  ) : (
                    <CategoryTreeNodeRuntimeProvider value={categoryTreeNodeRuntimeValue}>
                      <FolderTreeViewportV2
                        controller={controller}
                        className='space-y-0.5'
                        rootDropUi={rootDropUi}
                        canStartDrag={canStartCategoryDrag}
                        resolveDropPosition={resolveCategoryDropPosition}
                        renderNode={(nodeProps) => <CategoryTreeNodeRenderer {...nodeProps} />}
                      />
                    </CategoryTreeNodeRuntimeProvider>
                  )}
                </FolderTreePanel>
              )}
            </Card>
          </>
        )}
      </div>

      {!selectedCatalogId && catalogs.length === 0 && (
        <EmptyState
          title='No catalogs found'
          description='Please create a catalog first in the Catalogs section before adding categories.'
        />
      )}

      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Category'
        message={
          categoryToDelete?.children && categoryToDelete.children.length > 0
            ? `Are you sure you want to delete category "${categoryToDelete.name}" and ALL its subcategories? This cannot be undone.`
            : `Are you sure you want to delete category "${categoryToDelete?.name}"? This cannot be undone.`
        }
        confirmText='Delete'
        isDangerous={true}
      />

      <CategoryFormProvider
        value={{
          open: showModal,
          onClose: (): void => setShowModal(false),
          isEditing: !!editingCategory,
          formData,
          onFormDataChange: setFormData,
          onSave: (): void => {
            void handleSave();
          },
          saving: saveCategoryMutation.isPending,
          catalogs,
          onCatalogChange: setModalCatalogId,
          parentOptions,
          loadingCategories: modalLoadingCategories,
          modalCatalogName: modalCatalog?.name,
        }}
      >
        <CategoryForm />
      </CategoryFormProvider>
    </>
  );
}
