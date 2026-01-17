"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { ProductCategoryWithChildren, Catalog } from "@/types/products";

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
}: CategoryNodeProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const hasChildren = category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);

  const canDropHere = useMemo(() => {
    if (!draggedId) return true;
    if (draggedId === category.id) return false;

    // Check if the target category is a descendant of the dragged category
    const findCategory = (
      cats: ProductCategoryWithChildren[],
      id: string
    ): ProductCategoryWithChildren | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        const found = findCategory(cat.children, id);
        if (found) return found;
      }
      return null;
    };

    const isDescendant = (
      cat: ProductCategoryWithChildren,
      targetId: string
    ): boolean => {
      if (cat.id === targetId) return true;
      return cat.children.some((child) => isDescendant(child, targetId));
    };

    const draggedCategory = findCategory(allCategories, draggedId);
    if (!draggedCategory) return true;

    return !isDescendant(draggedCategory, category.id);
  }, [draggedId, category.id, allCategories]);

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("categoryId", category.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart(category.id);
          const target = e.currentTarget as HTMLElement;
          target.style.opacity = "0.5";
        }}
        onDragEnd={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.opacity = "1";
          onDragEnd();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (canDropHere) {
            setIsDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const droppedId = e.dataTransfer.getData("categoryId") || draggedId;
          if (droppedId && canDropHere) {
            onDrop(droppedId, category.id);
          }
        }}
        className={`group flex items-center gap-1 rounded px-2 py-1.5 cursor-pointer active:cursor-grabbing transition ${
          isDragOver && canDropHere
            ? "bg-emerald-600 text-white"
            : "text-gray-300 hover:bg-gray-800"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(category.id)}
            className="p-0.5 hover:bg-gray-700 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded || !hasChildren ? (
            <FolderOpen className="size-4 flex-shrink-0" style={{ color: category.color || "#10b981" }} />
          ) : (
            <Folder className="size-4 flex-shrink-0" style={{ color: category.color || "#10b981" }} />
          )}
          <span className="text-sm truncate">{category.name}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateChild(category.id);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="Add subcategory"
          >
            <FolderPlus className="size-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="Edit category"
          >
            <Edit2 className="size-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category);
            }}
            className="p-1 hover:bg-red-600 rounded"
            title="Delete category"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {category.children.map((child) => (
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

export function CategoriesSettings({
  loading,
  categories,
  catalogs,
  selectedCatalogId,
  onCatalogChange,
  onRefresh,
}: CategoriesSettingsProps) {
  const { toast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ProductCategoryWithChildren | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#10b981",
  });
  const [saving, setSaving] = useState(false);

  // Reset expanded state when catalog changes
  useEffect(() => {
    setExpandedIds(new Set());
  }, [selectedCatalogId]);

  // Expand all categories on initial load
  useEffect(() => {
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

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleOpenCreateModal = (parentId: string | null = null) => {
    if (!selectedCatalogId) {
      toast("Please select a catalog first", { variant: "error" });
      return;
    }
    setEditingCategory(null);
    setParentIdForNew(parentId);
    setFormData({ name: "", description: "", color: "#10b981" });
    setShowModal(true);
  };

  const handleOpenEditModal = (category: ProductCategoryWithChildren) => {
    setEditingCategory(category);
    setParentIdForNew(null);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#10b981",
    });
    setShowModal(true);
  };

  const handleDelete = async (category: ProductCategoryWithChildren) => {
    const hasChildren = category.children.length > 0;
    const message = hasChildren
      ? `Delete category "${category.name}" and all its subcategories? This cannot be undone.`
      : `Delete category "${category.name}"? This cannot be undone.`;

    if (!window.confirm(message)) return;

    try {
      const res = await fetch(`/api/products/categories/${category.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete category");
      }

      toast("Category deleted successfully", { variant: "success" });
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete category";
      toast(message, { variant: "error" });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast("Category name is required", { variant: "error" });
      return;
    }

    if (!selectedCatalogId && !editingCategory) {
      toast("Please select a catalog first", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingCategory
        ? `/api/products/categories/${editingCategory.id}`
        : "/api/products/categories";

      const payload = editingCategory
        ? {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: formData.color,
          }
        : {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: formData.color,
            parentId: parentIdForNew,
            catalogId: selectedCatalogId,
          };

      const res = await fetch(endpoint, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to save category");
      }

      toast(
        editingCategory
          ? "Category updated successfully"
          : "Category created successfully",
        { variant: "success" }
      );
      setShowModal(false);
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save category";
      toast(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = async (draggedCatId: string, targetId: string | null) => {
    if (draggedCatId === targetId) return;

    try {
      const res = await fetch(`/api/products/categories/${draggedCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: targetId }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to move category");
      }

      toast("Category moved successfully", { variant: "success" });
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to move category";
      toast(message, { variant: "error" });
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const catId = e.dataTransfer.getData("categoryId") || draggedId;
    if (catId) {
      handleDrop(catId, null);
    }
  };

  const selectedCatalog = catalogs.find((c) => c.id === selectedCatalogId);

  return (
    <div className="space-y-5">
      {/* Catalog Selector */}
      <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
        <p className="text-sm font-semibold text-white mb-3">Select Catalog</p>
        <p className="text-xs text-gray-400 mb-3">
          Each catalog has its own category tree. Select a catalog to manage its categories.
        </p>
        <div className="w-full max-w-xs">
          <Select
            value={selectedCatalogId || ""}
            onValueChange={onCatalogChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a catalog..." />
            </SelectTrigger>
            <SelectContent>
              {catalogs.map((catalog) => (
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
              onClick={() => handleOpenCreateModal(null)}
              className="bg-white text-gray-900 hover:bg-gray-200"
            >
              <Plus className="size-4 mr-2" />
              Add Category
            </Button>
          </div>

          <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
            <p className="text-sm font-semibold text-white mb-4">
              Category Tree for &quot;{selectedCatalog?.name}&quot;
            </p>

            {loading ? (
              <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                No categories yet for this catalog. Create your first category!
              </div>
            ) : (
              <div
                className="space-y-0.5 rounded-md border border-gray-800 bg-gray-900 p-2"
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={handleRootDrop}
              >
                {/* Root drop zone */}
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-500 border border-dashed border-gray-700 mb-2"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("bg-emerald-600/20", "border-emerald-500");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("bg-emerald-600/20", "border-emerald-500");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("bg-emerald-600/20", "border-emerald-500");
                    handleRootDrop(e);
                  }}
                >
                  <Folder className="size-4" />
                  <span>Drop here to move to root level</span>
                </div>

                {categories.map((category) => (
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
                    onDragEnd={() => setDraggedId(null)}
                    onDrop={handleDrop}
                    allCategories={categories}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedCatalogId && catalogs.length === 0 && (
        <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
          No catalogs found. Please create a catalog first in the Catalogs section.
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingCategory ? "Edit Category" : "Create Category"}
              </h2>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Name</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Category name"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Description</label>
                <textarea
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Color</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-20 cursor-pointer rounded border border-gray-800 bg-gray-900"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, color: e.target.value }))
                    }
                  />
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, color: e.target.value }))
                    }
                    placeholder="#10b981"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  className="rounded-md border border-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-900"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
