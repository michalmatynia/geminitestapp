"use client";

import { useToast, Button, Label } from "@/shared/ui";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Save, ChevronRight, ChevronDown, Check } from "lucide-react";

import type { ExternalCategory, CategoryMappingWithDetails } from "@/features/integrations/types/category-mapping";
import type { ProductCategory, Catalog } from "@/features/products";


type BaseCategoryMapperProps = {
  connectionId: string;
  connectionName: string;
};

type ExternalCategoryWithState = ExternalCategory & {
  isExpanded?: boolean;
  mappedToId?: string | null;
};

export function BaseCategoryMapper({ connectionId, connectionName }: BaseCategoryMapperProps): React.JSX.Element {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);

  const [internalCategories, setInternalCategories] = useState<ProductCategory[]>([]);
  const [internalCategoriesLoading, setInternalCategoriesLoading] = useState(false);

  const [externalCategories, setExternalCategories] = useState<ExternalCategoryWithState[]>([]);
  const [externalCategoriesLoading, setExternalCategoriesLoading] = useState(false);

  const [mappings, setMappings] = useState<CategoryMappingWithDetails[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);

  const [pendingMappings, setPendingMappings] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  const { toast } = useToast();

  // Fetch catalogs
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setCatalogsLoading(true);
        const res = await fetch("/api/catalogs");
        if (!res.ok) throw new Error("Failed to fetch catalogs");
        const data = (await res.json()) as Catalog[];
        setCatalogs(data);

        // Auto-select default catalog
        const defaultCatalog = data.find((c: Catalog) => c.isDefault) ?? data[0];
        if (defaultCatalog) {
          setSelectedCatalogId(defaultCatalog.id);
        }
      } catch (error) {
        console.error("Failed to fetch catalogs:", error);
        toast("Failed to load catalogs", { variant: "error" });
      } finally {
        setCatalogsLoading(false);
      }
    };
    void load();
  }, [toast]);

  // Fetch internal categories when catalog changes
  useEffect(() => {
    if (!selectedCatalogId) {
      setInternalCategories([]);
      return;
    }

    const load = async (): Promise<void> => {
      try {
        setInternalCategoriesLoading(true);
        const res = await fetch(`/api/products/categories?catalogId=${selectedCatalogId}`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = (await res.json()) as ProductCategory[];
        setInternalCategories(data);
      } catch (error) {
        console.error("Failed to fetch internal categories:", error);
        toast("Failed to load internal categories", { variant: "error" });
      } finally {
        setInternalCategoriesLoading(false);
      }
    };
    void load();
  }, [selectedCatalogId, toast]);

  // Fetch external categories and mappings when connection changes
  const fetchExternalCategories = useCallback(async (): Promise<void> => {
    try {
      setExternalCategoriesLoading(true);
      const res = await fetch(`/api/marketplace/categories?connectionId=${connectionId}`);
      if (!res.ok) throw new Error("Failed to fetch external categories");
      const data = (await res.json()) as ExternalCategory[];
      setExternalCategories(data.map((c: ExternalCategory) => ({ ...c, isExpanded: c.depth === 0 })));
    } catch (error) {
      console.error("Failed to fetch external categories:", error);
      toast("Failed to load external categories", { variant: "error" });
    } finally {
      setExternalCategoriesLoading(false);
    }
  }, [connectionId, toast]);

  const fetchMappings = useCallback(async (): Promise<void> => {
    if (!selectedCatalogId) return;

    try {
      setMappingsLoading(true);
      const res = await fetch(
        `/api/marketplace/mappings?connectionId=${connectionId}&catalogId=${selectedCatalogId}`
      );
      if (!res.ok) throw new Error("Failed to fetch mappings");
      const data = (await res.json()) as CategoryMappingWithDetails[];
      setMappings(data);
    } catch (error) {
      console.error("Failed to fetch mappings:", error);
      toast("Failed to load category mappings", { variant: "error" });
    } finally {
      setMappingsLoading(false);
    }
  }, [connectionId, selectedCatalogId, toast]);

  useEffect(() => {
    void fetchExternalCategories();
  }, [fetchExternalCategories]);

  useEffect(() => {
    void fetchMappings();
    // Reset pending mappings when catalog changes
    setPendingMappings(new Map());
  }, [fetchMappings, selectedCatalogId]);

  // Fetch categories from Base.com API
  const handleFetchFromBase = async (): Promise<void> => {
    try {
      setFetching(true);
      const res = await fetch("/api/marketplace/categories/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to fetch categories");
      }

      const result = (await res.json()) as { fetched: number; message: string };
      toast(result.message, { variant: "success" });

      // Refresh the list
      await fetchExternalCategories();
    } catch (error) {
      console.error("Failed to fetch from Base.com:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch categories";
      toast(message, { variant: "error" });
    } finally {
      setFetching(false);
    }
  };

  // Get current mapping for an external category
  const getMappingForExternal = useCallback(
    (externalCategoryId: string): string | null => {
      // Check pending mappings first
      if (pendingMappings.has(externalCategoryId)) {
        return pendingMappings.get(externalCategoryId) ?? null;
      }
      // Check saved mappings
      const mapping = mappings.find((m: CategoryMappingWithDetails) => m.externalCategoryId === externalCategoryId);
      return mapping?.internalCategoryId ?? null;
    },
    [mappings, pendingMappings]
  );

  // Handle mapping change
  const handleMappingChange = (externalCategoryId: string, internalCategoryId: string | null): void => {
    setPendingMappings((prev: Map<string, string>) => {
      const next = new Map(prev);
      if (internalCategoryId) {
        next.set(externalCategoryId, internalCategoryId);
      } else {
        next.delete(externalCategoryId);
      }
      return next;
    });
  };

  // Save all pending mappings
  const handleSave = async (): Promise<void> => {
    if (pendingMappings.size === 0 || !selectedCatalogId) {
      toast("No changes to save", { variant: "info" });
      return;
    }

    try {
      setSaving(true);
      const mappingsToSave = Array.from(pendingMappings.entries()).map(
        ([externalCategoryId, internalCategoryId]: [string, string]) => ({
          externalCategoryId,
          internalCategoryId,
        })
      );

      const res = await fetch("/api/marketplace/mappings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          catalogId: selectedCatalogId,
          mappings: mappingsToSave,
        }),
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to save mappings");
      }

      const result = (await res.json()) as { upserted: number; message: string };
      toast(result.message, { variant: "success" });

      // Refresh mappings and clear pending
      await fetchMappings();
      setPendingMappings(new Map());
    } catch (error) {
      console.error("Failed to save mappings:", error);
      const message = error instanceof Error ? error.message : "Failed to save mappings";
      toast(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Toggle category expansion
  const toggleExpand = (categoryId: string): void => {
    setExternalCategories((prev: ExternalCategoryWithState[]) =>
      prev.map((c: ExternalCategoryWithState) => (c.id === categoryId ? { ...c, isExpanded: !c.isExpanded } : c))
    );
  };

  // Build tree structure for display
  const categoryTree = useMemo((): ExternalCategoryWithState[] => {
    const buildLevel = (parentExternalId: string | null): ExternalCategoryWithState[] => {
      return externalCategories
        .filter((c: ExternalCategoryWithState) => c.parentExternalId === parentExternalId)
        .sort((a: ExternalCategoryWithState, b: ExternalCategoryWithState) => a.name.localeCompare(b.name));
    };

    return buildLevel(null);
  }, [externalCategories]);

  // Count statistics
  const stats = useMemo((): { total: number; mapped: number; pending: number } => {
    const total = externalCategories.length;
    const mapped = externalCategories.filter((c: ExternalCategoryWithState) => getMappingForExternal(c.id) !== null).length;
    const pending = pendingMappings.size;
    return { total, mapped, pending };
  }, [externalCategories, getMappingForExternal, pendingMappings.size]);

  // Render category row with children
  const renderCategory = (category: ExternalCategoryWithState, depth: number = 0): React.JSX.Element => {
    const children = externalCategories.filter((c: ExternalCategoryWithState) => c.parentExternalId === category.externalId);
    const hasChildren = children.length > 0;
    const isExpanded = category.isExpanded ?? false;
    const currentMapping = getMappingForExternal(category.id);
    const hasPendingChange = pendingMappings.has(category.id);

    return (
      <React.Fragment key={category.id}>
        <tr className={`border-b border-border ${hasPendingChange ? "bg-yellow-500/5" : ""}`}>
          <td className="px-4 py-2">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 20}px` }}>
              {hasChildren ? (
                <Button
                  onClick={(): void => toggleExpand(category.id)}
                  className="mr-2 rounded p-0.5 text-gray-400 hover:bg-muted/50 hover:text-white"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <span className="mr-2 w-5" />
              )}
              <span className="text-sm text-gray-200">{category.name}</span>
              {currentMapping && (
                <Check className="ml-2 h-3 w-3 text-emerald-400" />
              )}
            </div>
          </td>
          <td className="px-4 py-2">
            <select
              value={currentMapping ?? ""}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                handleMappingChange(category.id, e.target.value || null)
              }
              className="w-full rounded border bg-gray-800 px-2 py-1 text-sm text-white"
              disabled={internalCategoriesLoading || !selectedCatalogId}
            >
              <option value="">— Not mapped —</option>
              {internalCategories.map((ic: ProductCategory) => (
                <option key={ic.id} value={ic.id}>
                  {ic.name}
                </option>
              ))}
            </select>
          </td>
        </tr>
        {hasChildren && isExpanded && (
          <>
            {children
              .sort((a: ExternalCategoryWithState, b: ExternalCategoryWithState) => a.name.localeCompare(b.name))
              .map((child: ExternalCategoryWithState) => renderCategory(child, depth + 1))}
          </>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Base.com Categories
          </h2>
          <p className="text-sm text-gray-400">
            Connection: {connectionName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={(): void => { void handleFetchFromBase(); }}
            disabled={fetching}
            className="flex items-center gap-2 rounded-md border bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {fetching ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {fetching ? "Fetching..." : "Fetch Categories"}
          </Button>

          <Button
            onClick={(): void => { void handleSave(); }}
            disabled={saving || pendingMappings.size === 0}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : `Save (${pendingMappings.size})`}
          </Button>
        </div>
      </div>

      {/* Catalog Selector */}
      <div className="flex items-center gap-4">
        <Label className="text-sm text-gray-400">Target Catalog:</Label>
        <select
          value={selectedCatalogId ?? ""}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setSelectedCatalogId(e.target.value || null)}
          disabled={catalogsLoading}
          className="rounded border bg-gray-800 px-3 py-2 text-sm text-white"
        >
          {catalogsLoading && <option value="">Loading...</option>}
          {!catalogsLoading && catalogs.length === 0 && (
            <option value="">No catalogs available</option>
          )}
          {catalogs.map((catalog: Catalog) => (
            <option key={catalog.id} value={catalog.id}>
              {catalog.name}
            </option>
          ))}
        </select>

        {selectedCatalogId && (
          <span className="text-xs text-gray-500">
            {internalCategories.length} internal categories
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm">
        <div className="text-gray-400">
          Total: <span className="text-white">{stats.total}</span>
        </div>
        <div className="text-gray-400">
          Mapped: <span className="text-emerald-400">{stats.mapped}</span>
        </div>
        {stats.pending > 0 && (
          <div className="text-gray-400">
            Unsaved changes: <span className="text-yellow-400">{stats.pending}</span>
          </div>
        )}
      </div>

      {/* Category Table */}
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">
                External Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">
                Internal Category
              </th>
            </tr>
          </thead>
          <tbody>
            {externalCategoriesLoading || mappingsLoading ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                  Loading categories...
                </td>
              </tr>
            ) : externalCategories.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                  No external categories found. Click &quot;Fetch Categories&quot; to load from Base.com.
                </td>
              </tr>
            ) : (
              categoryTree.map((category: ExternalCategoryWithState) => renderCategory(category, 0))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
