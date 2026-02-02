"use client";

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast, Input, Textarea, Label, SharedModal, EmptyState, ConfirmDialog } from "@/shared/ui";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  FolderPlus,
} from "lucide-react";

import type { ProductCategoryWithChildren, Catalog, ProductCategory } from "@/features/products/types";
import { useSaveCategoryMutation, useDeleteCategoryMutation } from "@/features/products/hooks/useProductSettingsQueries";

type CategoriesSettingsProps = {
  loading: boolean;
  categories: ProductCategoryWithChildren[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

type CategoryNodeProps = {
  category: ProductCategoryWithChildren;
  level: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (category: ProductCategoryWithChildren) => void;
  onDelete: (category: ProductCategoryWithChildren) => void;
  onCreateChild: (parentId: string) => void;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (draggedId: string, targetId: string | null) => void;
  allCategories: ProductCategoryWithChildren[];
};

function CategoryNode({
  category,
  level,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onCreateChild,
  draggedId,
  onDragStart,
  onDragEnd,
  onDrop,
  allCategories,
}: CategoryNodeProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const hasChildren: boolean = category.children.length > 0;
  const isExpanded: boolean = expandedIds.has(category.id);

  const canDropHere: boolean = useMemo((): boolean => {
    if (!draggedId) return true;
    if (draggedId === category.id) return false;

    // Check if the target category is a descendant of the dragged category
    const isDescendant = (
      cat: ProductCategoryWithChildren,
      targetId: string
    ): boolean => {
      if (cat.id === targetId) return true;
      return cat.children.some((child: ProductCategoryWithChildren): boolean => isDescendant(child, targetId));
    };

    const findCategory = (
      cats: ProductCategoryWithChildren[],
      id: string
    ): ProductCategoryWithChildren | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        const found: ProductCategoryWithChildren | null = findCategory(cat.children, id);
        if (found) return found;
      }
      return null;
    };

    const draggedCategory: ProductCategoryWithChildren | null = findCategory(allCategories, draggedId);
    if (!draggedCategory) return true;

    return !isDescendant(draggedCategory, category.id);
  }, [draggedId, category.id, allCategories]);

  return (
    <div>
      <div
        draggable
        onDragStart={(e: React.DragEvent): void => {
          e.stopPropagation();
          e.dataTransfer.setData("categoryId", category.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart(category.id);
          const target: HTMLElement = e.currentTarget as HTMLElement;
          target.style.opacity = "0.5";
        }}
        onDragEnd={(e: React.DragEvent): void => {
          const target: HTMLElement = e.currentTarget as HTMLElement;
          target.style.opacity = "1";
          onDragEnd();
        }}
        onDragOver={(e: React.DragEvent): void => {
          e.preventDefault();
          e.stopPropagation();
          if (canDropHere) {
            setIsDragOver(true);
          }
        }}
        onDragLeave={(e: React.DragEvent): void => {
          e.stopPropagation();
          setIsDragOver(false);
        }}
        onDrop={(e: React.DragEvent): void => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const droppedId: string = e.dataTransfer.getData("categoryId") || (draggedId ?? "");
          if (droppedId && canDropHere) {
            onDrop(droppedId, category.id);
          }
        }}
        className={`group flex items-center gap-1 rounded px-2 py-1.5 cursor-pointer active:cursor-grabbing transition ${
          isDragOver && canDropHere
            ? "bg-emerald-600 text-white"
            : "text-gray-300 hover:bg-muted/50"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <Button
            onClick={(): void => onToggleExpand(category.id)}
            className="p-0.5 hover:bg-gray-700 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        ) : (
          <div className="w-5" />
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm truncate">{category.name}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onCreateChild(category.id);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="Add subcategory"
          >
            <FolderPlus className="size-3" />
          </Button>
          <Button
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onEdit(category);
            }}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700"
            title="Edit category"
          >
            Edit
          </Button>
          <Button
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onDelete(category);
            }}
            className="p-1 hover:bg-red-600 rounded"
            title="Delete category"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {category.children.map((child: ProductCategoryWithChildren): React.JSX.Element => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
              draggedId={draggedId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              allCategories={allCategories}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type CategoryFormData = {
  name: string;
  description: string;
  color: string;
  parentId: string | null;
  catalogId: string;
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
    name: "",
    description: "",
    color: "#10b981",
    parentId: null,
    catalogId: "",
  });
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategoryWithChildren | null>(null);

  const saveCategoryMutation = useSaveCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();

  const [modalCatalogId, setModalCatalogId] = useState<string | null>(null);
  const [modalCategories, setModalCategories] = useState<ProductCategoryWithChildren[]>([]);
  const [modalLoadingCategories, setModalLoadingCategories] = useState<boolean>(false);

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
      toast("Please select a catalog first", { variant: "error" });
      return;
    }
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      color: "#10b981",
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
      description: category.description || "",
      color: category.color || "#10b981",
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
      toast("Category deleted successfully", { variant: "success" });
      onRefresh();
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : "Failed to delete category";
      toast(message, { variant: "error" });
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast("Category name is required", { variant: "error" });
      return;
    }

    const targetCatalogId: string | undefined = (formData.catalogId || selectedCatalogId) || undefined;
    if (!targetCatalogId && !editingCategory) {
      toast("Please select a catalog first", { variant: "error" });
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
          ? "Category updated successfully"
          : "Category created successfully",
        { variant: "success" }
      );
      setShowModal(false);
      onRefresh();
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : "Failed to save category";
      toast(message, { variant: "error" });
    }
  };

  const handleDrop = async (draggedCatId: string, targetId: string | null): Promise<void> => {
    if (draggedCatId === targetId) return;

    try {
      await saveCategoryMutation.mutateAsync({
        id: draggedCatId,
        data: { parentId: targetId, catalogId: selectedCatalogId || undefined },
      });

      toast("Category moved successfully", { variant: "success" });
      onRefresh();
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : "Failed to move category";
      toast(message, { variant: "error" });
    }
  };

  const handleRootDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    const catId: string = e.dataTransfer.getData("categoryId") || (draggedId ?? "");
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

  const loadModalCategories = useCallback(
    async (catalogId: string): Promise<void> => {
      setModalLoadingCategories(true);
      try {
        const res: Response = await fetch(
          `/api/products/categories/tree?catalogId=${catalogId}`
        );
        if (!res.ok) {
          const error: { error?: string } = (await res.json()) as { error?: string };
          throw new Error(error.error || "Failed to load categories.");
        }
        const data: ProductCategoryWithChildren[] = (await res.json()) as ProductCategoryWithChildren[];
        setModalCategories(data);
      } catch (error) {
        const message: string =
          error instanceof Error ? error.message : "Failed to load categories.";
        toast(message, { variant: "error" });
        setModalCategories([]);
      } finally {
        setModalLoadingCategories(false);
      }
    },
    [toast]
  );

  useEffect((): void => {
    if (!showModal || !modalCatalogId) return;
    if (modalCatalogId === selectedCatalogId) {
      setModalCategories(categories);
      return;
    }
    void loadModalCategories(modalCatalogId);
  }, [showModal, modalCatalogId, selectedCatalogId, categories, loadModalCategories]);

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
      <div className="rounded-md border border-border bg-card/60 p-4">
        <p className="text-sm font-semibold text-white mb-3">Select Catalog</p>
        <p className="text-xs text-gray-400 mb-3">
          Each catalog has its own category tree. Select a catalog to manage its categories.
        </p>
        <div className="w-full max-w-xs">
          <Select
            value={selectedCatalogId || ""}
            onValueChange={onCatalogChange}
          >
            <SelectTrigger suppressHydrationWarning>
              <SelectValue placeholder="Select a catalog..." />
            </SelectTrigger>
            <SelectContent>
              {catalogs.map((catalog: Catalog): React.JSX.Element => (
                <SelectItem key={catalog.id} value={catalog.id}>
                  {catalog.name}
                  {catalog.isDefault && " (Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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

          <div className="rounded-md border border-border bg-card/60 p-4">
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
                    (e.currentTarget as HTMLElement).classList.add("bg-emerald-600/20", "border-emerald-500");
                  }}
                  onDragLeave={(e: React.DragEvent): void => {
                    (e.currentTarget as HTMLElement).classList.remove("bg-emerald-600/20", "border-emerald-500");
                  }}
                  onDrop={(e: React.DragEvent): void => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).classList.remove("bg-emerald-600/20", "border-emerald-500");
                    handleRootDrop(e);
                  }}
                >
                  <span>Drop here to move to root level</span>
                </div>

                {categories.map((category: ProductCategoryWithChildren): React.JSX.Element => (
                  <CategoryNode
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
          </div>
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
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        description={
          categoryToDelete?.children && categoryToDelete.children.length > 0
            ? `Are you sure you want to delete category "${categoryToDelete.name}" and ALL its subcategories? This cannot be undone.`
            : `Are you sure you want to delete category "${categoryToDelete?.name}"? This cannot be undone.`
        }
        confirmText="Delete"
        variant="destructive"
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <SharedModal
          open={showModal}
          onClose={(): void => setShowModal(false)}
          title={editingCategory ? "Edit Category" : "Create Category"}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-400">Name</Label>
              <Input
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: CategoryFormData) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Category name"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-400">Description</Label>
              <Textarea
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                rows={3}
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  setFormData((prev: CategoryFormData) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional description"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-400">Catalog</Label>
              <select
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={formData.catalogId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => {
                  const nextCatalogId: string = e.target.value;
                  setFormData((prev: CategoryFormData) => ({
                    ...prev,
                    catalogId: nextCatalogId,
                    parentId:
                      prev.catalogId !== nextCatalogId ? null : prev.parentId,
                  }));
                  setModalCatalogId(nextCatalogId);
                }}
              >
                {catalogs.map((catalog: Catalog): React.JSX.Element => (
                  <option key={catalog.id} value={catalog.id}>
                    {catalog.name}
                    {catalog.isDefault ? " (Default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-gray-400">Parent Category</Label>
              <select
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={formData.parentId ?? ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData((prev: CategoryFormData) => ({
                    ...prev,
                    parentId: e.target.value ? e.target.value : null,
                  }))
                }
                disabled={modalLoadingCategories}
              >
                <option value="">No parent (root)</option>
                {parentOptions.map((option: { id: string; name: string; level: number }): React.JSX.Element => (
                  <option key={option.id} value={option.id}>
                    {"|-- ".repeat(option.level)}
                    {option.name}
                  </option>
                ))}
              </select>
              {modalLoadingCategories && (
                <p className="mt-1 text-xs text-gray-500">Loading categories...</p>
              )}
              {!modalLoadingCategories &&
                modalCatalogId &&
                parentOptions.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No categories available in{" "}
                    {modalCatalog?.name ?? "this catalog"}.
                  </p>
                )}
            </div>

            <div>
              <Label className="text-xs text-gray-400">Color</Label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  type="color"
                  className="h-10 w-20 cursor-pointer rounded border border-border bg-gray-900"
                  value={formData.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: TagFormData) => ({ ...prev, color: e.target.value }))
                  }
                />
                <Input
                  type="text"
                  className="flex-1 rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                  value={formData.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: TagFormData) => ({ ...prev, color: e.target.value }))
                  }
                  placeholder="#10b981"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                className="rounded-md border border-border px-3 py-2 text-sm text-gray-300 hover:bg-muted/50"
                type="button"
                onClick={(): void => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                type="button"
                onClick={(): void => { void handleSave(); }}
                disabled={saveCategoryMutation.isPending}
              >
                {saveCategoryMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </SharedModal>
      )}
    </div>
  );
}