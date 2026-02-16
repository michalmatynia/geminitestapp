'use client';

import {
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderOpen,
  GripVertical,
  Plus,
} from 'lucide-react';
import React, { useState, useCallback, useMemo, useEffect } from 'react';

import {
  MasterFolderTree,
  useMasterFolderTreeInstance,
} from '@/features/foldertree';
import { logClientError } from '@/features/observability';
import type { ReorderCategoryPayload } from '@/features/products/api/settings';
import { useProductCategoryTree } from '@/features/products/hooks/useCategoryQueries';
import {
  useSaveCategoryMutation,
  useDeleteCategoryMutation,
  useReorderCategoryMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductCategoryWithChildren, Catalog, ProductCategory } from '@/features/products/types';
import {
  Button,
  EmptyState,
  FolderTreePanel,
  
  Skeleton,
  TreeActionButton,
  TreeActionSlot,
  TreeCaret,
  SelectSimple,
  useToast,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import {
  cn,
  type MasterTreeNode,
} from '@/shared/utils';

import {
  buildMasterNodesFromCategoryTree,
  fromCategoryMasterNodeId,
} from './category-master-tree';
import { createCategoryMasterTreeAdapter } from './category-master-tree-adapter';
import { CategoryForm } from './CategoryForm';
import { CategoryFormProvider, type CategoryFormData } from './CategoryFormContext';
import { useProductSettingsContext } from './ProductSettingsContext';

const cloneCategoryTree = (
  nodes: ProductCategoryWithChildren[]
): ProductCategoryWithChildren[] =>
  nodes.map((node: ProductCategoryWithChildren): ProductCategoryWithChildren => ({
    ...node,
    children: cloneCategoryTree(node.children),
  }));

export function CategoriesSettings(): React.JSX.Element {
  const {
    loadingCategories: loading,
    categories,
    catalogs,
    selectedCategoryCatalogId: selectedCatalogId,
    onCategoryCatalogChange: onCatalogChange,
    onRefreshCategories: onRefresh,
  } = useProductSettingsContext();

  const { toast } = useToast();
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
  const reorderCategory = reorderCategoryMutation.mutateAsync;

  const [modalCatalogId, setModalCatalogId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<ProductCategoryWithChildren[]>(() => cloneCategoryTree(categories));

  const { data: fetchedModalCategories, isLoading: modalLoadingCategories } = useProductCategoryTree(modalCatalogId || undefined);

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
        logClientError(error, {
          context: {
            source: 'CategoriesSettings',
            action: 'applyCategoryReorderPayload',
            payload,
          },
        });
        const message: string =
          error instanceof Error ? error.message : 'Failed to move category';
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
    panelCollapsed,
    setPanelCollapsed,
  } = useMasterFolderTreeInstance({
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

  const { FolderClosedIcon, FolderOpenIcon, DragHandleIcon } = useMemo(
    () => ({
      FolderClosedIcon: resolveIcon({
        slot: 'folderClosed',
        kind: 'category',
        fallback: Folder,
        fallbackId: 'Folder',
      }),
      FolderOpenIcon: resolveIcon({
        slot: 'folderOpen',
        kind: 'category',
        fallback: FolderOpen,
        fallbackId: 'FolderOpen',
      }),
      DragHandleIcon: resolveIcon({
        slot: 'dragHandle',
        fallback: GripVertical,
        fallbackId: 'GripVertical',
      }),
    }),
    [resolveIcon]
  );

  return (
    <div className='space-y-5'>
      {/* Catalog Selector */}
      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <p className='text-sm font-semibold text-white mb-3'>Select Catalog</p>
        <p className='text-xs text-gray-400 mb-3'>
          Each catalog has its own category tree. Select a catalog to manage its categories.
        </p>
        <div className='w-full max-w-xs'>
          <SelectSimple size='sm'
            value={selectedCatalogId || ''}
            onValueChange={onCatalogChange}
            options={catalogs.map((catalog: Catalog) => ({
              value: catalog.id,
              label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`
            }))}
            placeholder='Select a catalog...'
          />
        </div>
      </div>

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

          <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
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
                  >
                    {panelCollapsed ? (
                      <>
                        <ChevronRight className='mr-1 size-3.5 -scale-x-100' />
                        Show Tree
                      </>
                    ) : (
                      <>
                        <ChevronLeft className='mr-1 size-3.5' />
                        Collapse
                      </>
                    )}
                  </Button>
                </div>
                {panelCollapsed ? (
                  <div className='rounded border border-dashed border-border/70 bg-card/30 px-3 py-4 text-center text-xs text-gray-400'>
                    Category tree is collapsed.
                  </div>
                ) : (
                  <MasterFolderTree
                    controller={controller}
                    className='space-y-0.5'
                    rootDropUi={rootDropUi}
                    renderNode={({
                      node,
                      depth,
                      hasChildren,
                      isExpanded,
                      isSelected,
                      dropPosition,
                      select,
                      toggleExpand,
                    }) => {
                      const categoryId = fromCategoryMasterNodeId(node.id);
                      if (!categoryId) return null;
                      const category = categoryById.get(categoryId);
                      if (!category) return null;
                      const Icon = isExpanded ? FolderOpenIcon : FolderClosedIcon;
                      const showDropLine = dropPosition === 'before' || dropPosition === 'after';

                      return (
                        <div className='relative'>
                          <div
                            className={cn(
                              'pointer-events-none absolute inset-x-2 h-px rounded-full transition-opacity duration-150',
                              dropPosition === 'before' ? 'top-[2px]' : 'bottom-[2px]',
                              placeholderClasses.lineActive,
                              showDropLine ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div
                            role='button'
                            tabIndex={0}
                            onClick={select}
                            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                select();
                              }
                            }}
                            className={cn(
                              'group flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-sm transition',
                              isSelected ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-muted/40',
                              dropPosition === 'inside' && !isSelected ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/45' : ''
                            )}
                            style={{ paddingLeft: `${depth * 16 + 8}px` }}
                            title={category.name}
                          >
                            <span className='inline-flex items-center justify-center opacity-0 transition group-hover:opacity-100'>
                              <DragHandleIcon className='size-3 shrink-0 text-gray-500' />
                            </span>
                            <TreeCaret
                              isOpen={isExpanded}
                              hasChildren={hasChildren}
                              onToggle={
                                hasChildren
                                  ? (): void => {
                                    toggleExpand();
                                  }
                                  : undefined
                              }
                              ariaLabel={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
                              placeholderClassName='w-4'
                              buttonClassName='hover:bg-gray-700'
                              iconClassName='size-3.5'
                            />
                            <Icon className='size-3.5 shrink-0 text-gray-400' />
                            <span className='flex-1 truncate'>{category.name}</span>

                            <TreeActionSlot show='hover' align='inline'>
                              <TreeActionButton
                                onClick={(event: React.MouseEvent): void => {
                                  event.stopPropagation();
                                  handleOpenCreateModal(category.id);
                                }}
                                size='sm'
                                tone='muted'
                                className='px-1.5 text-[11px]'
                                title='Add subcategory'
                              >
                                Add
                              </TreeActionButton>
                              <TreeActionButton
                                onClick={(event: React.MouseEvent): void => {
                                  event.stopPropagation();
                                  handleOpenEditModal(category);
                                }}
                                size='sm'
                                tone='muted'
                                className='px-1.5 text-[11px]'
                                title='Edit category'
                              >
                                Edit
                              </TreeActionButton>
                              <TreeActionButton
                                onClick={(event: React.MouseEvent): void => {
                                  event.stopPropagation();
                                  handleDelete(category);
                                }}
                                size='sm'
                                tone='danger'
                                className='px-1.5 text-[11px]'
                                title='Delete category'
                              >
                                Delete
                              </TreeActionButton>
                            </TreeActionSlot>
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
              </FolderTreePanel>
            )}
          </div>
        </>
      )}

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
