'use client';

import { Plus } from 'lucide-react';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { logClientError } from '@/features/observability';
import { useProductCategoryTree } from '@/features/products/hooks/useCategoryQueries';
import {
  useSaveCategoryMutation,
  useDeleteCategoryMutation,
  useReorderCategoryMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductCategoryWithChildren, Catalog, ProductCategory } from '@/features/products/types';
import {
  Button,
  UnifiedSelect,
  useToast,
  EmptyState,
  ConfirmDialog,
  SectionPanel,
  FolderTreePanel,
} from '@/shared/ui';
import { DRAG_KEYS, getFirstDragValue } from '@/shared/utils/drag-drop';

import { CategoryForm } from './CategoryForm';
import { CategoryFormProvider, type CategoryFormData } from './CategoryFormContext';
import { CategoryTreeProvider, type CategoryDropTarget } from './CategoryTreeContext';
import { CategoryTreeItem } from './CategoryTreeItem';

type CategoriesSettingsProps = {
  loading: boolean;
  categories: ProductCategoryWithChildren[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

const cloneCategoryTree = (
  nodes: ProductCategoryWithChildren[]
): ProductCategoryWithChildren[] =>
  nodes.map((node: ProductCategoryWithChildren): ProductCategoryWithChildren => ({
    ...node,
    children: cloneCategoryTree(node.children),
  }));

const removeCategoryFromTree = (
  nodes: ProductCategoryWithChildren[],
  id: string
): ProductCategoryWithChildren | null => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node) continue;
    if (node.id === id) {
      const [removed] = nodes.splice(index, 1);
      return removed ?? null;
    }
    const removedFromChildren = removeCategoryFromTree(node.children, id);
    if (removedFromChildren) return removedFromChildren;
  }
  return null;
};

const findCategoryChildrenBucket = (
  nodes: ProductCategoryWithChildren[],
  parentId: string | null
): ProductCategoryWithChildren[] | null => {
  if (parentId === null) return nodes;
  for (const node of nodes) {
    if (node.id === parentId) return node.children;
    const nested = findCategoryChildrenBucket(node.children, parentId);
    if (nested) return nested;
  }
  return null;
};

const normalizeCategorySortIndices = (
  nodes: ProductCategoryWithChildren[]
): ProductCategoryWithChildren[] =>
  nodes.map(
    (node: ProductCategoryWithChildren, index: number): ProductCategoryWithChildren => ({
      ...node,
      sortIndex: index,
      children: normalizeCategorySortIndices(node.children),
    })
  );

const applyOptimisticCategoryDrop = (
  tree: ProductCategoryWithChildren[],
  draggedCatId: string,
  target: CategoryDropTarget
): ProductCategoryWithChildren[] | null => {
  const nextTree = cloneCategoryTree(tree);
  const draggedNode = removeCategoryFromTree(nextTree, draggedCatId);
  if (!draggedNode) return null;

  const targetBucket = findCategoryChildrenBucket(nextTree, target.parentId);
  if (!targetBucket) return null;

  draggedNode.parentId = target.parentId;
  if (target.position === 'inside') {
    targetBucket.push(draggedNode);
    return normalizeCategorySortIndices(nextTree);
  }

  if (!target.targetId) return null;
  const targetIndex = targetBucket.findIndex(
    (entry: ProductCategoryWithChildren): boolean => entry.id === target.targetId
  );
  if (targetIndex < 0) return null;

  const insertionIndex = target.position === 'before' ? targetIndex : targetIndex + 1;
  targetBucket.splice(insertionIndex, 0, draggedNode);
  return normalizeCategorySortIndices(nextTree);
};

export function CategoriesSettings({
  loading,
  categories,
  catalogs,
  selectedCatalogId,
  onCatalogChange,
  onRefresh,
}: CategoriesSettingsProps): React.JSX.Element {
  const { toast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] =
    useState<ProductCategoryWithChildren | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: '#10b981',
    parentId: null,
    catalogId: '',
  });
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategoryWithChildren | null>(null);

  const saveCategoryMutation = useSaveCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const reorderCategoryMutation = useReorderCategoryMutation();

  const [modalCatalogId, setModalCatalogId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<ProductCategoryWithChildren[]>(() => cloneCategoryTree(categories));
  const treeBodyRef = useRef<HTMLDivElement | null>(null);

  const { data: fetchedModalCategories, isLoading: modalLoadingCategories } = useProductCategoryTree(modalCatalogId || undefined);

  useEffect((): void => {
    setTreeData(cloneCategoryTree(categories));
  }, [categories]);

  const modalCategories = useMemo(() => {
    if (modalCatalogId === selectedCatalogId) return treeData;
    return fetchedModalCategories || [];
  }, [modalCatalogId, selectedCatalogId, treeData, fetchedModalCategories]);

  // Reset expanded state when catalog changes
  useEffect((): void => {
    setExpandedIds(new Set());
  }, [selectedCatalogId]);

  // Expand all categories on initial load
  useEffect((): void => {
    if (treeData.length > 0 && expandedIds.size === 0) {
      const collectIds = (cats: ProductCategoryWithChildren[]): string[] => {
        const ids: string[] = [];
        for (const cat of cats) {
          ids.push(cat.id);
          if (cat.children.length > 0) {
            ids.push(...collectIds(cat.children));
          }
        }
        return ids;
      };
      setExpandedIds(new Set(collectIds(treeData)));
    }
  }, [treeData, expandedIds.size]);

  const handleToggleExpand = useCallback((id: string): void => {
    setExpandedIds((prev: Set<string>): Set<string> => {
      const next: Set<string> = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleOpenCreateModal = (parentId: string | null = null): void => {
    if (!selectedCatalogId) {
      toast('Please select a catalog first', { variant: 'error' });
      return;
    }
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      color: '#10b981',
      parentId,
      catalogId: selectedCatalogId,
    });
    setModalCatalogId(selectedCatalogId);
    setShowModal(true);
  };

  const handleOpenEditModal = (category: ProductCategoryWithChildren): void => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#10b981',
      parentId: category.parentId ?? null,
      catalogId: category.catalogId,
    });
    setModalCatalogId(category.catalogId);
    setShowModal(true);
  };

  const handleDelete = useCallback((category: ProductCategoryWithChildren): void => {
    setCategoryToDelete(category);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!categoryToDelete) return;
    try {
      await deleteCategoryMutation.mutateAsync({ id: categoryToDelete.id, catalogId: selectedCatalogId });
      toast('Category deleted successfully', { variant: 'success' });
      onRefresh();
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'CategoriesSettings', action: 'deleteCategory', categoryId: categoryToDelete.id } });
      const message: string =
        error instanceof Error ? error.message : 'Failed to delete category';
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

    const targetCatalogId: string | undefined = (formData.catalogId || selectedCatalogId) || undefined;
    if (!targetCatalogId && !editingCategory) {
      toast('Please select a catalog first', { variant: 'error' });
      return;
    }

    try {
      const payload: Partial<ProductCategory> = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        parentId: formData.parentId ?? null,
        catalogId: targetCatalogId!,
      };

      await saveCategoryMutation.mutateAsync({
        id: editingCategory?.id,
        data: payload,
      });

      toast(
        editingCategory
          ? 'Category updated successfully'
          : 'Category created successfully',
        { variant: 'success' }
      );
      setShowModal(false);
      onRefresh();
    } catch (error) {
      logClientError(error, { context: { source: 'CategoriesSettings', action: 'saveCategory', categoryId: editingCategory?.id } });
      const message: string =
        error instanceof Error ? error.message : 'Failed to save category';
      toast(message, { variant: 'error' });
    }
  };

  const handleDrop = async (
    draggedCatId: string,
    target: CategoryDropTarget
  ): Promise<void> => {
    if (draggedCatId === target.parentId) return;
    const previousTree = cloneCategoryTree(treeData);
    const optimisticTree = applyOptimisticCategoryDrop(treeData, draggedCatId, target);
    if (optimisticTree) {
      setTreeData(optimisticTree);
    }

    try {
      await reorderCategoryMutation.mutateAsync({
        categoryId: draggedCatId,
        parentId: target.parentId,
        position: target.position,
        targetId: target.targetId,
        ...(selectedCatalogId ? { catalogId: selectedCatalogId } : {})
      });

      toast('Category moved successfully', { variant: 'success' });
      onRefresh();
    } catch (error) {
      setTreeData(previousTree);
      logClientError(error, { context: { source: 'CategoriesSettings', action: 'reorderCategory', categoryId: draggedCatId, target } });
      const message: string =
        error instanceof Error ? error.message : 'Failed to move category';
      toast(message, { variant: 'error' });
    }
  };

  const handleRootDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    const catId: string = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.CATEGORY_ID], draggedId ?? '') || '';
    if (catId) {
      void handleDrop(catId, { parentId: null, position: 'inside', targetId: null });
    }
  };

  const selectedCatalog: Catalog | undefined = catalogs.find((c: Catalog): boolean => c.id === selectedCatalogId);
  const modalCatalog: Catalog | undefined = catalogs.find((c: Catalog): boolean => c.id === modalCatalogId);

  const findCategory = useCallback(
    (
      cats: ProductCategoryWithChildren[],
      id: string
    ): ProductCategoryWithChildren | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        const found: ProductCategoryWithChildren | null = findCategory(
          cat.children,
          id
        );
        if (found) return found;
      }
      return null;
    },
    []
  );

  const collectDescendantIds = useCallback((cat: ProductCategoryWithChildren): string[] => {
    const ids: string[] = [];
    for (const child of cat.children) {
      ids.push(child.id, ...collectDescendantIds(child));
    }
    return ids;
  }, []);

  const categoryOptions: { id: string; name: string; level: number }[] = useMemo((): { id: string; name: string; level: number }[] => {
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
    const current: ProductCategoryWithChildren | null = findCategory(modalCategories, editingCategory.id);
    if (!current) return new Set<string>();
    return new Set([editingCategory.id, ...collectDescendantIds(current)]);
  }, [editingCategory, modalCatalogId, modalCategories, findCategory, collectDescendantIds]);

  const parentOptions: { id: string; name: string; level: number }[] = useMemo(
    (): { id: string; name: string; level: number }[] => categoryOptions.filter((opt: { id: string }): boolean => !excludedParentIds.has(opt.id)),
    [categoryOptions, excludedParentIds]
  );

  useEffect((): void => {
    if (!showModal) return;
    if (!formData.parentId) return;
    const stillValid: boolean = parentOptions.some((opt: { id: string }): boolean => opt.id === formData.parentId);
    if (!stillValid) {
      setFormData((prev: CategoryFormData) => ({ ...prev, parentId: null }));
    }
  }, [showModal, parentOptions, formData.parentId]);

  return (
    <div className='space-y-5'>
      {/* Catalog Selector */}
      <SectionPanel variant='subtle' className='p-4'>
        <p className='text-sm font-semibold text-white mb-3'>Select Catalog</p>
        <p className='text-xs text-gray-400 mb-3'>
          Each catalog has its own category tree. Select a catalog to manage its categories.
        </p>
        <div className='w-full max-w-xs'>
          <UnifiedSelect
            value={selectedCatalogId || ''}
            onValueChange={onCatalogChange}
            options={catalogs.map((catalog: Catalog) => ({
              value: catalog.id,
              label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`
            }))}
            placeholder='Select a catalog...'
          />
        </div>
      </SectionPanel>

      {/* Category Tree */}
      {selectedCatalogId && (
        <>
          <div className='flex justify-start'>
            <Button
              onClick={(): void => handleOpenCreateModal(null)}
              className='bg-white text-gray-900 hover:bg-gray-200'
            >
              <Plus className='size-4 mr-2' />
              Add Category
            </Button>
          </div>

          <SectionPanel variant='subtle' className='p-4'>
            <p className='text-sm font-semibold text-white mb-4'>
              Category Tree for &quot;{selectedCatalog?.name}&quot;
            </p>

            {loading && treeData.length === 0 ? (
              <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
                Loading categories...
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
                onDragOver={(e: React.DragEvent): void => {
                  const draggedCategoryId = getFirstDragValue(
                    e.dataTransfer,
                    [DRAG_KEYS.CATEGORY_ID],
                    draggedId ?? ''
                  ) || '';
                  if (!draggedCategoryId) return;
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={handleRootDrop}
              >
                <CategoryTreeProvider
                  value={{
                    expandedIds,
                    onToggleExpand: handleToggleExpand,
                    onEdit: handleOpenEditModal,
                    onDelete: handleDelete,
                    onCreateChild: handleOpenCreateModal,
                    draggedId,
                    onDragStart: setDraggedId,
                    onDragEnd: (): void => {
                      setDraggedId(null);
                    },
                    onDrop: (e: string, target: CategoryDropTarget): void => {
                      void handleDrop(e, target);
                    },
                    allCategories: treeData,
                  }}
                >
                  <div ref={treeBodyRef} className='space-y-0.5'>
                    {treeData.map((category: ProductCategoryWithChildren): React.JSX.Element => (
                      <CategoryTreeItem
                        key={category.id}
                        category={category}
                        level={0}
                      />
                    ))}
                  </div>
                </CategoryTreeProvider>
              </FolderTreePanel>
            )}
          </SectionPanel>
        </>
      )}

      {!selectedCatalogId && catalogs.length === 0 && (
        <EmptyState
          title='No catalogs found'
          description='Please create a catalog first in the Catalogs section before adding categories.'
        />
      )}

      <ConfirmDialog
        open={!!categoryToDelete}
        onOpenChange={(open: boolean) => !open && setCategoryToDelete(null)}
        onConfirm={(): void => { void handleConfirmDelete(); }}
        title='Delete Category'
        description={
          categoryToDelete?.children && categoryToDelete.children.length > 0
            ? `Are you sure you want to delete category "${categoryToDelete.name}" and ALL its subcategories? This cannot be undone.`
            : `Are you sure you want to delete category "${categoryToDelete?.name}"? This cannot be undone.`
        }
        confirmText='Delete'
        variant='destructive'
      />

      <CategoryFormProvider
        value={{
          open: showModal,
          onClose: (): void => setShowModal(false),
          isEditing: !!editingCategory,
          formData,
          onFormDataChange: setFormData,
          onSave: (): void => { void handleSave(); },
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
    </div>
  );
}
