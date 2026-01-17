"use client";

import React, { memo } from "react";
import { Table as ReactTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ProductWithImages } from "@/types";
import { logger } from "@/lib/logger";
import { useToast } from "@/components/ui/toast";

interface ProductTableFooterProps<TData> {
  table: ReactTable<TData>;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  setActionError: (error: string | null) => void;
}

export const ProductTableFooter = memo(function ProductTableFooter<TData>({
  table,
  setRefreshTrigger,
  setActionError,
}: ProductTableFooterProps<TData>) {
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
    </div>
  );
}) as <TData>(props: ProductTableFooterProps<TData>) => React.JSX.Element;
