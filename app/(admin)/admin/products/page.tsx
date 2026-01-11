"use client";

import { useEffect, useState } from "react";
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

function DataTableFooter<TData>(
  table: ReactTable<TData>,
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>
) {
  const handleMassDelete = async () => {
    const selectedProductIds = table
      .getSelectedRowModel()
      .rows.map((row) => (row.original as ProductWithImages).id);

    if (selectedProductIds.length === 0) {
      alert("Please select products to delete.");
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
          alert(`Some products could not be deleted.${errorIdSuffix}`);
        } else {
          alert("Selected products deleted successfully.");
        }
        table.setRowSelection({}); // Clear selection after deletion
        setRefreshTrigger((prev) => prev + 1); // Refresh the product list
      } catch (error) {
        console.error("Error during mass deletion:", error);
        alert("An error occurred during deletion.");
      }
    }
  };

  return (
    <div className="flex items-center justify-between space-x-2 px-2 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <Button
        onClick={() => {
          void handleMassDelete();
        }}
        disabled={table.getFilteredSelectedRowModel().rows.length === 0}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Delete Selected
      </Button>
    </div>
  );
}

function CreateProductModalContent({ onClose }: { onClose: () => void }) {
  const { showFileManager, handleMultiFileSelect } = useProductFormContext();

  return (
    <div className="w-full max-w-6xl rounded-lg bg-gray-950 p-6 shadow-lg md:min-w-[960px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Create Product</h2>
        <Button
          onClick={onClose}
          className="bg-gray-800 text-white hover:bg-gray-700"
        >
          Close
        </Button>
      </div>
      <div className="h-[70vh] overflow-y-auto pr-2">
        {showFileManager ? (
          <FileManager onSelectFile={handleMultiFileSelect} />
        ) : (
          <ProductForm submitButtonText="Create" />
        )}
      </div>
    </div>
  );
}

function EditProductModalContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const { showFileManager, handleMultiFileSelect } = useProductFormContext();

  return (
    <div className="w-full max-w-6xl rounded-lg bg-gray-950 p-6 shadow-lg md:min-w-[960px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Edit Product</h2>
        <Button
          onClick={onClose}
          className="bg-gray-800 text-white hover:bg-gray-700"
        >
          Close
        </Button>
      </div>
      <div className="h-[70vh] overflow-y-auto pr-2">
        {showFileManager ? (
          <FileManager onSelectFile={handleMultiFileSelect} />
        ) : (
          <ProductForm submitButtonText="Update" />
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
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
  const [editingProduct, setEditingProduct] = useState<ProductWithImages | null>(null);
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nameLocale, setNameLocale] = useState<
    "name_en" | "name_pl" | "name_de"
  >("name_en");

  useEffect(() => {
    const stored = window.localStorage.getItem("productListNameLocale");
    if (stored === "name_en" || stored === "name_pl" || stored === "name_de") {
      setNameLocale(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("productListNameLocale", nameLocale);
  }, [nameLocale]);

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    setInitialSku("");
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    setInitialSku("");
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
    const skuInput = window.prompt("Enter a new unique SKU:");
    if (skuInput === null) return;
    const sku = skuInput.trim().toUpperCase();
    const skuPattern = /^[A-Z0-9]+$/;
    if (!sku) {
      alert("SKU is required.");
      return;
    }
    if (!skuPattern.test(sku)) {
      alert("SKU must use uppercase letters and numbers only.");
      return;
    }
    try {
      const res = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`);
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string; errorId?: string };
        const message = payload?.error || "Failed to validate SKU";
        const errorIdSuffix = payload?.errorId ? ` (Error ID: ${payload.errorId})` : "";
        alert(`${message}${errorIdSuffix}`);
        return;
      }
      const products = (await res.json()) as ProductWithImages[];
      const skuExists = products.some((product) => product.sku === sku);
      if (skuExists) {
        alert("SKU already exists.");
        return;
      }
    } catch (error) {
      console.error("Failed to validate SKU:", error);
      alert("Failed to validate SKU. Please try again.");
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
        console.error("Failed to load products:", error);
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
    if (!lastEditedId) return;
    if (data.length === 0) return;
    const target = document.querySelector(
      `[data-row-id="${lastEditedId}"]`
    );
    if (target instanceof HTMLElement) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [data, lastEditedId]);

  return (
    <div className="container mx-auto py-10">
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
        </div>
        {loadError && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {loadError}
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
              setMinPrice(e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            className="max-w-xs"
          />
          <Input
            type="number"
            placeholder="Max Price"
            value={maxPrice || ""}
            onChange={(e) =>
              setMaxPrice(e.target.value ? parseInt(e.target.value, 10) : undefined)
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
          data={data}
          setRefreshTrigger={setRefreshTrigger}
          productNameKey={nameLocale}
          onProductNameClick={handleOpenEditModal}
          onProductEditClick={handleOpenEditModal}
          getRowId={(row) => row.id}
          footer={(table) => DataTableFooter(table, setRefreshTrigger)}
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
