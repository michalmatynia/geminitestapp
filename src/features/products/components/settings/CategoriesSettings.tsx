'use client';

import { Plus } from 'lucide-react';
import React, { useState, useCallback, useMemo, useEffect } from 'react';

import { useSaveCategoryMutation, useDeleteCategoryMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductCategoryWithChildren, Catalog, ProductCategory } from '@/features/products/types';
import {
  Button,
  UnifiedSelect,
  useToast,
  EmptyState,
  ConfirmDialog,
  SectionPanel,
} from '@/shared/ui';
import { DRAG_KEYS, getFirstDragValue } from '@/shared/utils/drag-drop';

import { CategoryForm, type CategoryFormData } from './CategoryForm';
import { CategoryTreeItem } from './CategoryTreeItem';

type CategoriesSettingsProps = {
  loading: boolean;
  categories: ProductCategoryWithChildren[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
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

  const [modalCatalogId, setModalCatalogId] = useState<string | null>(null);
  
  const { data: fetchedModalCategories, isLoading: modalLoadingCategories } = useProductCategoryTree(modalCatalogId || undefined);
  
  const modalCategories = useMemo(() => {
    if (modalCatalogId === selectedCatalogId) return categories;
    return fetchedModalCategories || [];
  }, [modalCatalogId, selectedCatalogId, categories, fetchedModalCategories]);

  // Reset expanded state when catalog changes
  useEffect((): void => {
    setExpandedIds(new Set());
  }, [selectedCatalogId]);

  // Expand all categories on initial load
  useEffect((): void => {
    if (categories.length > 0 && expandedIds.size === 0) {
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
      setExpandedIds(new Set(collectIds(categories)));
    }
  }, [categories, expandedIds.size]);

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
      const message: string =
        error instanceof Error ? error.message : 'Failed to save category';
      toast(message, { variant: 'error' });
    }
  };

  const handleDrop = async (draggedCatId: string, targetId: string | null): Promise<void> => {
    if (draggedCatId === targetId) return;

    try {
      await saveCategoryMutation.mutateAsync({
        id: draggedCatId,
        data: {
          parentId: targetId,
          ...(selectedCatalogId ? { catalogId: selectedCatalogId } : {})
        },
      });

      toast('Category moved successfully', { variant: 'success' });
      onRefresh();
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : 'Failed to move category';
      toast(message, { variant: 'error' });
    }
  };

  const handleRootDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    const catId: string = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.CATEGORY_ID], draggedId ?? '') || '';
    if (catId) {
      void handleDrop(catId, null);
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
    <div className="space-y-5">
      {/* Catalog Selector */}
      <SectionPanel variant="subtle" className="p-4">
        <p className="text-sm font-semibold text-white mb-3">Select Catalog</p>
        <p className="text-xs text-gray-400 mb-3">
          Each catalog has its own category tree. Select a catalog to manage its categories.
        </p>
        <div className="w-full max-w-xs">
          <UnifiedSelect
            value={selectedCatalogId || ''}
            onValueChange={onCatalogChange}
            options={catalogs.map((catalog: Catalog) => ({
              value: catalog.id,
              label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`
            }))}
            placeholder="Select a catalog..."
          />
        </div>
      </SectionPanel>

      {/* Category Tree */}
      {selectedCatalogId && (
        <>
          <div className="flex justify-start">
            <Button
              onClick={(): void => handleOpenCreateModal(null)}
              className="bg-white text-gray-900 hover:bg-gray-200"
            >
              <Plus className="size-4 mr-2" />
              Add Category
            </Button>
          </div>

          <SectionPanel variant="subtle" className="p-4">
            <p className="text-sm font-semibold text-white mb-4">
              Category Tree for &quot;{selectedCatalog?.name}&quot;
            </p>

            {loading ? (
              <div className="rounded-md border border-dashed border p-4 text-center text-sm text-gray-400">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <EmptyState
                title="No categories yet"
                description="Categories help you organize products into a hierarchical tree."
                action={
                  <Button onClick={(): void => handleOpenCreateModal(null)} variant="outline">
                    <Plus className="size-4 mr-2" />
                    Add Category
                  </Button>
                }
              />
            ) : (
              <div
                className="space-y-0.5 rounded-md border border-border bg-gray-900 p-2"
                onDragOver={(e: React.DragEvent): void => {
                  e.preventDefault();
                }}
                onDrop={handleRootDrop}
              >
                {/* Root drop zone */}
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-500 border border-dashed border mb-2"
                  onDragOver={(e: React.DragEvent): void => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).classList.add('bg-emerald-600/20', 'border-emerald-500');
                  }}
                  onDragLeave={(e: React.DragEvent): void => {
                    (e.currentTarget as HTMLElement).classList.remove('bg-emerald-600/20', 'border-emerald-500');
                  }}
                  onDrop={(e: React.DragEvent): void => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).classList.remove('bg-emerald-600/20', 'border-emerald-500');
                    handleRootDrop(e);
                  }}
                >
                  <span>Drop here to move to root level</span>
                </div>

                {categories.map((category: ProductCategoryWithChildren): React.JSX.Element => (
                  <CategoryTreeItem
                    key={category.id}
                    category={category}
                    level={0}
                    expandedIds={expandedIds}
                    onToggleExpand={handleToggleExpand}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDelete}
                    onCreateChild={handleOpenCreateModal}
                    draggedId={draggedId}
                    onDragStart={setDraggedId}
                    onDragEnd={(): void => setDraggedId(null)}
                    onDrop={(e: string, targetId: string | null): void => void handleDrop(e, targetId)}
                    allCategories={categories}
                  />
                ))}
              </div>
            )}
          </SectionPanel>
        </>
      )}

      {!selectedCatalogId && catalogs.length === 0 && (
        <EmptyState
          title="No catalogs found"
          description="Please create a catalog first in the Catalogs section before adding categories."
        />
      )}

      <ConfirmDialog
        open={!!categoryToDelete}
        onOpenChange={(open: boolean) => !open && setCategoryToDelete(null)}
        onConfirm={(): void => { void handleConfirmDelete(); }}
        title="Delete Category"
        description={
          categoryToDelete?.children && categoryToDelete.children.length > 0
            ? `Are you sure you want to delete category "${categoryToDelete.name}" and ALL its subcategories? This cannot be undone.`
            : `Are you sure you want to delete category "${categoryToDelete?.name}"? This cannot be undone.`
        }
        confirmText="Delete"
        variant="destructive"
      />

      <CategoryForm
        open={showModal}
        onClose={(): void => setShowModal(false)}
        isEditing={!!editingCategory}
        formData={formData}
        onFormDataChange={setFormData}
        onSave={(): void => { void handleSave(); }}
        saving={saveCategoryMutation.isPending}
        catalogs={catalogs}
        onCatalogChange={setModalCatalogId}
        parentOptions={parentOptions}
        loadingCategories={modalLoadingCategories}
        modalCatalogName={modalCatalog?.name}
      />
    </div>
  );
}
