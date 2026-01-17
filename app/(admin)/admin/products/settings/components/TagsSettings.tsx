"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Catalog, ProductTag } from "@/types/products";

type TagsSettingsProps = {
  loading: boolean;
  tags: ProductTag[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

export function TagsSettings({
  loading,
  tags,
  catalogs,
  selectedCatalogId,
  onCatalogChange,
  onRefresh,
}: TagsSettingsProps) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#38bdf8",
    catalogId: "",
  });

  const openCreateModal = () => {
    if (!selectedCatalogId) {
      toast("Please select a catalog first.", { variant: "error" });
      return;
    }
    setEditingTag(null);
    setFormData({
      name: "",
      color: "#38bdf8",
      catalogId: selectedCatalogId,
    });
    setShowModal(true);
  };

  const openEditModal = (tag: ProductTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color ?? "#38bdf8",
      catalogId: tag.catalogId,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast("Tag name is required.", { variant: "error" });
      return;
    }
    if (!formData.catalogId) {
      toast("Catalog is required.", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingTag
        ? `/api/products/tags/${editingTag.id}`
        : "/api/products/tags";
      const res = await fetch(endpoint, {
        method: editingTag ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          color: formData.color.trim() || null,
          catalogId: formData.catalogId,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error || "Failed to save tag.");
      }
      toast(editingTag ? "Tag updated." : "Tag created.", {
        variant: "success",
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save tag.";
      toast(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: ProductTag) => {
    const confirmed = window.confirm(`Delete tag "${tag.name}"?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/products/tags/${tag.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error || "Failed to delete tag.");
      }
      toast("Tag deleted.", { variant: "success" });
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete tag.";
      toast(message, { variant: "error" });
    }
  };

  const selectedCatalog = catalogs.find((catalog) => catalog.id === selectedCatalogId);

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
        <p className="text-sm font-semibold text-white mb-3">Select Catalog</p>
        <p className="text-xs text-gray-400 mb-3">
          Tags are managed per catalog.
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
                  {catalog.isDefault ? " (Default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCatalogId && (
        <>
          <div className="flex justify-start">
            <Button
              onClick={openCreateModal}
              className="bg-white text-gray-900 hover:bg-gray-200"
            >
              <Plus className="size-4 mr-2" />
              Add Tag
            </Button>
          </div>

          <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
            <p className="text-sm font-semibold text-white mb-4">
              Tags for &quot;{selectedCatalog?.name}&quot;
            </p>

            {loading ? (
              <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                Loading tags...
              </div>
            ) : tags.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                No tags yet for this catalog. Create your first tag!
              </div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-gray-800 bg-gray-900 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="size-3 rounded-full border border-gray-700"
                        style={{ backgroundColor: tag.color || "#38bdf8" }}
                      />
                      <span className="text-sm text-gray-100 truncate">
                        {tag.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(tag)}
                        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tag)}
                        className="rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600"
                        title="Delete tag"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
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
                {editingTag ? "Edit Tag" : "Create Tag"}
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
                  placeholder="Tag name"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Catalog</label>
                <select
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  value={formData.catalogId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      catalogId: e.target.value,
                    }))
                  }
                >
                  {catalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                      {catalog.isDefault ? " (Default)" : ""}
                    </option>
                  ))}
                </select>
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
                    placeholder="#38bdf8"
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
