"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogRecord } from "@/types";
import type { ProductParameter } from "@/types/products";

type ParametersSettingsProps = {
  loading: boolean;
  parameters: ProductParameter[];
  catalogs: CatalogRecord[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

export function ParametersSettings({
  loading,
  parameters,
  catalogs,
  selectedCatalogId,
  onCatalogChange,
  onRefresh,
}: ParametersSettingsProps) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingParameter, setEditingParameter] = useState<ProductParameter | null>(null);
  const [formData, setFormData] = useState({
    name_en: "",
    name_pl: "",
    name_de: "",
    catalogId: "",
  });

  const openCreateModal = () => {
    if (!selectedCatalogId) {
      toast("Please select a catalog first.", { variant: "error" });
      return;
    }
    setEditingParameter(null);
    setFormData({
      name_en: "",
      name_pl: "",
      name_de: "",
      catalogId: selectedCatalogId,
    });
    setShowModal(true);
  };

  const openEditModal = (parameter: ProductParameter) => {
    setEditingParameter(parameter);
    setFormData({
      name_en: parameter.name_en,
      name_pl: parameter.name_pl ?? "",
      name_de: parameter.name_de ?? "",
      catalogId: parameter.catalogId,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name_en.trim()) {
      toast("English name is required.", { variant: "error" });
      return;
    }
    if (!formData.catalogId) {
      toast("Catalog is required.", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingParameter
        ? `/api/products/parameters/${editingParameter.id}`
        : "/api/products/parameters";
      const res = await fetch(endpoint, {
        method: editingParameter ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: formData.name_en.trim(),
          name_pl: formData.name_pl.trim() || null,
          name_de: formData.name_de.trim() || null,
          catalogId: formData.catalogId,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error || "Failed to save parameter.");
      }
      toast(editingParameter ? "Parameter updated." : "Parameter created.", {
        variant: "success",
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save parameter.";
      toast(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (parameter: ProductParameter) => {
    const confirmed = window.confirm(
      `Delete parameter "${parameter.name_en}"?`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/products/parameters/${parameter.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error || "Failed to delete parameter.");
      }
      toast("Parameter deleted.", { variant: "success" });
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete parameter.";
      toast(message, { variant: "error" });
    }
  };

  const selectedCatalog = catalogs.find(
    (catalog) => catalog.id === selectedCatalogId
  );

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
        <p className="text-sm font-semibold text-white mb-3">Select Catalog</p>
        <p className="text-xs text-gray-400 mb-3">
          Parameters are managed per catalog.
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
              Add Parameter
            </Button>
          </div>

          <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
            <p className="text-sm font-semibold text-white mb-4">
              Parameters for &quot;{selectedCatalog?.name}&quot;
            </p>

            {loading ? (
              <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                Loading parameters...
              </div>
            ) : parameters.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                No parameters yet for this catalog. Create your first parameter!
              </div>
            ) : (
              <div className="space-y-2">
                {parameters.map((parameter) => (
                  <div
                    key={parameter.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-gray-800 bg-gray-900 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-100 truncate">
                        {parameter.name_en}
                      </p>
                      <div className="text-xs text-gray-400 space-x-2">
                        {parameter.name_pl && (
                          <span>PL: {parameter.name_pl}</span>
                        )}
                        {parameter.name_de && (
                          <span>DE: {parameter.name_de}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(parameter)}
                        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(parameter)}
                        className="rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600"
                        title="Delete parameter"
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
                {editingParameter ? "Edit Parameter" : "Create Parameter"}
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Name (EN)</Label>
                <Input
                  value={formData.name_en}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      name_en: event.target.value,
                    }))
                  }
                  placeholder="Parameter name in English"
                />
              </div>
              <div>
                <Label className="text-sm">Name (PL)</Label>
                <Input
                  value={formData.name_pl}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      name_pl: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label className="text-sm">Name (DE)</Label>
                <Input
                  value={formData.name_de}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      name_de: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
