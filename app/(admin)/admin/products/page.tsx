"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Table as ReactTable } from "@tanstack/react-table";

import { columns } from "@/components/columns";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProducts } from "@/lib/api";
import { ProductWithImages } from "@/lib/types";
import FileManager from "@/components/products/FileManager";
import ProductForm from "@/components/products/ProductForm";
import {
  ProductFormProvider,
  useProductFormContext,
} from "@/lib/context/ProductFormContext";
import { PlusIcon } from "lucide-react";
import { logger } from "@/lib/logger";
import DebugPanel from "@/components/DebugPanel";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import ModalShell from "@/components/ui/modal-shell";

type Catalog = {
  id: string;
  name: string;
  description: string | null;
  isDefault?: boolean;
};

type BulkCatalogMode = "add" | "replace" | "remove";

function DataTableFooter<TData>({
  table,
  setRefreshTrigger,
  catalogs,
  catalogsLoading,
  catalogsError,
  setActionError,
}: {
  table: ReactTable<TData>;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  catalogs: Catalog[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  setActionError: (error: string | null) => void;
}) {
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<BulkCatalogMode>("add");

  const toggleCatalog = (catalogId: string) => {
    setSelectedCatalogIds((prev) =>
      prev.includes(catalogId)
        ? prev.filter((id) => id !== catalogId)
        : [...prev, catalogId]
    );
  };
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const hasSelection = selectedCount > 0;
  const { toast } = useToast();

  const handleMassDelete = async () => {
    logger.log("Mass delete initiated.");
    const selectedProductIds = table
      .getSelectedRowModel()
      .rows.map((row) => (row.original as ProductWithImages).id);

    if (selectedProductIds.length === 0) {
      setActionError("Please select products to delete.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedProductIds.length} selected products?`
      )
    ) {
      try {
        const deletePromises = selectedProductIds.map((id) =>
          fetch(`/api/products/${id}`, {
            method: "DELETE",
          })
        );
        const results = await Promise.all(deletePromises);

        const failedDeletions = results.filter((res) => !res.ok);

        if (failedDeletions.length > 0) {
          let errorIdSuffix = "";
          try {
            const payload = (await failedDeletions[0].json()) as {
              errorId?: string;
            };
            if (payload?.errorId) {
              errorIdSuffix = ` (Error ID: ${payload.errorId})`;
            }
          } catch {
            errorIdSuffix = "";
          }
          setActionError(`Some products could not be deleted.${errorIdSuffix}`);
        } else {
          toast("Selected products deleted successfully.", {
            variant: "success",
          });
        }
        table.setRowSelection({}); // Clear selection after deletion
        setRefreshTrigger((prev) => prev + 1); // Refresh the product list
      } catch (error) {
        logger.error("Error during mass deletion:", error);
        setActionError("An error occurred during deletion.");
      }
    }
  };

  const handleBulkCatalogAssign = async () => {
    logger.log("Bulk catalog assignment initiated.");
    const selectedProductIds = table
      .getSelectedRowModel()
      .rows.map((row) => (row.original as ProductWithImages).id);

    if (selectedProductIds.length === 0) {
      setActionError("Please select products to update catalogs.");
      return;
    }
    if (selectedCatalogIds.length === 0) {
      setActionError("Select at least one catalog.");
      return;
    }
    const actionLabel =
      bulkMode === "replace"
        ? "replace catalogs"
        : bulkMode === "remove"
          ? "remove catalogs"
          : "add catalogs";
    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} for ${selectedProductIds.length} selected products?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/catalogs/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedProductIds,
          catalogIds: selectedCatalogIds,
          mode: bulkMode,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
        const message = payload?.error || "Failed to update catalogs.";
        const errorIdSuffix = payload?.errorId
          ? ` (Error ID: ${payload.errorId})`
          : "";
        setActionError(`${message}${errorIdSuffix}`);
        return;
      }
      toast("Catalogs updated successfully.", { variant: "success" });
      table.setRowSelection({});
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      logger.error("Error during bulk catalog assignment:", error);
      setActionError("An error occurred while updating catalogs.");
    }
  };

  const catalogSummary = useMemo(() => {
    if (catalogsLoading) return "Loading catalogs...";
    if (catalogsError) return catalogsError;
    if (catalogs.length === 0) return "No catalogs available.";
    return `${selectedCatalogIds.length} selected`;
  }, [
    catalogsLoading,
    catalogsError,
    catalogs.length,
    selectedCatalogIds.length,
  ]);

  return (
    <div className="space-y-3 px-2 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedCount} of {table.getFilteredRowModel().rows.length} row(s)
          selected.
        </div>
        <Button
          onClick={() => {
            void handleMassDelete();
          }}
          disabled={!hasSelection}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Delete Selected
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-gray-800 bg-gray-950/60 px-3 py-3">
        <div className="text-sm text-gray-300">Catalogs</div>
        <Select
          value={bulkMode}
          onValueChange={(value) => setBulkMode(value as BulkCatalogMode)}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Add</SelectItem>
            <SelectItem value="replace">Replace</SelectItem>
            <SelectItem value="remove">Remove</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto text-xs text-gray-200">
          {catalogs.length === 0 ? (
            <span className="text-gray-500">{catalogSummary}</span>
          ) : (
            catalogs.map((catalog) => (
              <label
                key={catalog.id}
                className="inline-flex items-center gap-2 rounded border border-gray-800 bg-gray-900 px-2 py-1"
              >
                <input
                  type="checkbox"
                  checked={selectedCatalogIds.includes(catalog.id)}
                  onChange={() => toggleCatalog(catalog.id)}
                />
                <span>{catalog.name}</span>
              </label>
            ))
          )}
        </div>
        <div className="text-xs text-gray-500">{catalogSummary}</div>
        <Button
          onClick={() => {
            void handleBulkCatalogAssign();
          }}
          disabled={!hasSelection || selectedCatalogIds.length === 0}
          className="h-8 bg-white px-3 text-xs font-semibold text-gray-900 hover:bg-gray-200"
        >
          Apply to Selected
        </Button>
      </div>
    </div>
  );
}

function CreateProductModalContent({ onClose }: { onClose: () => void }) {
  const { showFileManager, handleMultiFileSelect } = useProductFormContext();

  return (
    <ModalShell title="Create Product" onClose={onClose}>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm submitButtonText="Create" />
      )}
    </ModalShell>
  );
}

function EditProductModalContent({ onClose }: { onClose: () => void }) {
  const { showFileManager, handleMultiFileSelect } = useProductFormContext();

  return (
    <ModalShell title="Edit Product" onClose={onClose}>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm submitButtonText="Update" />
      )}
    </ModalShell>
  );
}

export default function AdminPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ProductWithImages[]>([]);
  // The refreshTrigger state is used to force a re-fetch of the products
  // when a product is deleted.
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [search, setSearch] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialSku, setInitialSku] = useState<string>("");
  const [editingProduct, setEditingProduct] =
    useState<ProductWithImages | null>(null);
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [nameLocale, setNameLocale] = useState<
    "name_en" | "name_pl" | "name_de"
  >("name_en");
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const { toast } = useToast();
  const catalogFilterInitialized = useRef(false);

  useEffect(() => {
    setIsDebugOpen(searchParams.get("debug") === "true");
  }, [searchParams]);

  useEffect(() => {
    const stored = window.localStorage.getItem("productListNameLocale");
    if (stored === "name_en" || stored === "name_pl" || stored === "name_de") {
      setNameLocale(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("productListNameLocale", nameLocale);
  }, [nameLocale]);

  useEffect(() => {
    const storedCatalog = window.localStorage.getItem(
      "productListCatalogFilter"
    );
    if (storedCatalog) {
      setCatalogFilter(storedCatalog);
      catalogFilterInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (catalogFilterInitialized.current) {
      return;
    }
    if (catalogsLoading) {
      return;
    }
    const defaultCatalog = catalogs.find((catalog) => catalog.isDefault);
    setCatalogFilter(defaultCatalog ? defaultCatalog.id : "all");
    catalogFilterInitialized.current = true;
  }, [catalogs, catalogsLoading]);

  useEffect(() => {
    window.localStorage.setItem("productListCatalogFilter", catalogFilter);
  }, [catalogFilter]);

  const filteredCatalogData = useMemo(() => {
    if (catalogFilter === "all") {
      return data;
    }
    if (catalogFilter === "unassigned") {
      return data.filter((product) => product.catalogs.length === 0);
    }
    return data.filter((product) =>
      product.catalogs.some((entry) => entry.catalogId === catalogFilter)
    );
  }, [catalogFilter, data]);

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    setInitialSku("");
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    setInitialSku("");
    toast("Product created", { variant: "success" });
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleOpenEditModal = (product: ProductWithImages) => {
    setEditingProduct(product);
  };

  const handleCloseEditModal = () => {
    setEditingProduct(null);
  };

  const handleEditSuccess = () => {
    if (editingProduct) {
      setLastEditedId(editingProduct.id);
    }
    setEditingProduct(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleOpenCreateModal = async () => {
    logger.log("Open create modal initiated.");
    const skuInput = window.prompt("Enter a new unique SKU:");
    if (skuInput === null) return;
    const sku = skuInput.trim().toUpperCase();
    const skuPattern = /^[A-Z0-9]+$/;
    if (!sku) {
      setActionError("SKU is required.");
      return;
    }
    if (!skuPattern.test(sku)) {
      setActionError("SKU must use uppercase letters and numbers only.");
      return;
    }
    try {
      const res = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`);
      if (!res.ok) {
        const payload = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
        const message = payload?.error || "Failed to validate SKU";
        const errorIdSuffix = payload?.errorId
          ? ` (Error ID: ${payload.errorId})`
          : "";
        setActionError(`${message}${errorIdSuffix}`);
        return;
      }
      const products = (await res.json()) as ProductWithImages[];
      const skuExists = products.some((product) => product.sku === sku);
      if (skuExists) {
        setActionError("SKU already exists.");
        return;
      }
    } catch (error) {
      logger.error("Failed to validate SKU:", error);
      setActionError("Failed to validate SKU. Please try again.");
      return;
    }
    setInitialSku(sku);
    setIsCreateOpen(true);
  };

  useEffect(() => {
    const filters = { search, sku, minPrice, maxPrice, startDate, endDate };
    let cancelled = false;
    setLoadError(null);
    const loadProducts = async () => {
      try {
        const products = await getProducts(filters);
        if (!cancelled) {
          setData(products);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load products";
        logger.error("Failed to load products:", error);
        if (!cancelled) {
          setLoadError(message);
        }
      }
    };
    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [search, sku, minPrice, maxPrice, startDate, endDate, refreshTrigger]);

  useEffect(() => {
    let cancelled = false;
    const loadCatalogs = async () => {
      try {
        setCatalogsLoading(true);
        const res = await fetch("/api/catalogs");
        if (!res.ok) {
          const payload = (await res.json()) as {
            error?: string;
            errorId?: string;
          };
          const message = payload?.error || "Failed to load catalogs";
          const suffix = payload?.errorId
            ? ` (Error ID: ${payload.errorId})`
            : "";
          throw new Error(`${message}${suffix}`);
        }
        const data = (await res.json()) as Catalog[];
        if (!cancelled) {
          setCatalogs(data);
        }
      } catch (error) {
        logger.error("Failed to load catalogs:", error);
        if (!cancelled) {
          setCatalogsError(
            error instanceof Error ? error.message : "Failed to load catalogs"
          );
        }
      } finally {
        if (!cancelled) {
          setCatalogsLoading(false);
        }
      }
    };
    void loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!lastEditedId) return;
    if (data.length === 0) return;
    const target = document.querySelector(`[data-row-id="${lastEditedId}"]`);
    if (target instanceof HTMLElement) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [data, lastEditedId]);

  return (
    <div className="container mx-auto py-10">
      {isDebugOpen && <DebugPanel />}
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                void handleOpenCreateModal();
              }}
              className="size-11 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90"
              aria-label="Create product"
            >
              <PlusIcon className="size-5" />
            </Button>
            <h1 className="text-3xl font-bold text-white">Products</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-44">
              <Select
                value={nameLocale}
                onValueChange={(value) =>
                  setNameLocale(value as "name_en" | "name_pl" | "name_de")
                }
              >
                <SelectTrigger aria-label="Select product name language">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_en">English</SelectItem>
                  <SelectItem value="name_pl">Polish</SelectItem>
                  <SelectItem value="name_de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-52">
              <Select value={catalogFilter} onValueChange={setCatalogFilter}>
                <SelectTrigger aria-label="Filter by catalog">
                  <SelectValue placeholder="Catalog" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All catalogs</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {catalogs.map((catalog) => (
                    <SelectItem key={catalog.id} value={catalog.id}>
                      {catalog.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {loadError && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionError}
            <Button
              onClick={() => setActionError(null)}
              className="ml-4 bg-transparent text-red-200 hover:bg-red-500/20"
            >
              Dismiss
            </Button>
          </div>
        )}
        <div className="mb-4 flex space-x-4">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Input
            placeholder="Search by SKU..."
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="max-w-sm"
          />
          <Input
            type="number"
            placeholder="Min Price"
            value={minPrice || ""}
            onChange={(e) =>
              setMinPrice(
                e.target.value ? parseInt(e.target.value, 10) : undefined
              )
            }
            className="max-w-xs"
          />
          <Input
            type="number"
            placeholder="Max Price"
            value={maxPrice || ""}
            onChange={(e) =>
              setMaxPrice(
                e.target.value ? parseInt(e.target.value, 10) : undefined
              )
            }
            className="max-w-xs"
          />
          <Input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredCatalogData}
          setRefreshTrigger={setRefreshTrigger}
          productNameKey={nameLocale}
          onProductNameClick={handleOpenEditModal}
          onProductEditClick={handleOpenEditModal}
          getRowId={(row) => row.id}
          footer={(table) => (
            <DataTableFooter
              table={table}
              setRefreshTrigger={setRefreshTrigger}
              catalogs={catalogs}
              catalogsLoading={catalogsLoading}
              catalogsError={catalogsError}
              setActionError={setActionError}
            />
          )}
        />
      </div>
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={handleCloseCreateModal}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <ProductFormProvider
              onSuccess={handleCreateSuccess}
              initialSku={initialSku}
            >
              <CreateProductModalContent onClose={handleCloseCreateModal} />
            </ProductFormProvider>
          </div>
        </div>
      )}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={handleCloseEditModal}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <ProductFormProvider
              product={editingProduct}
              onSuccess={handleEditSuccess}
            >
              <EditProductModalContent onClose={handleCloseEditModal} />
            </ProductFormProvider>
          </div>
        </div>
      )}
    </div>
  );
}
