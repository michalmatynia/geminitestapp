"use client";

import { useEffect, useState } from "react";
import { Table as ReactTable } from "@tanstack/react-table";

import { columns } from "@/components/columns";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/lib/api";
import { ProductWithImages } from "@/lib/types";
import FileManager from "@/components/products/FileManager";
import ProductForm from "@/components/products/ProductForm";
import {
  ProductFormProvider,
  useProductFormContext,
} from "@/lib/context/ProductFormContext";

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
          alert("Some products could not be deleted.");
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

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const filters = { search, sku, minPrice, maxPrice, startDate, endDate };
    void getProducts(filters).then(setData);
  }, [search, sku, minPrice, maxPrice, startDate, endDate, refreshTrigger]);

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Products</h1>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Create Product
          </Button>
        </div>
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
          footer={(table) => DataTableFooter(table, setRefreshTrigger)}
        />
      </div>
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={handleCloseCreateModal}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <ProductFormProvider onSuccess={handleCreateSuccess}>
              <CreateProductModalContent onClose={handleCloseCreateModal} />
            </ProductFormProvider>
          </div>
        </div>
      )}
    </div>
  );
}
