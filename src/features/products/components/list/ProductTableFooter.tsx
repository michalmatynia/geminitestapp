"use client";

import { Button, useToast, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui";
import React, { memo } from "react";
import { Table as ReactTable } from "@tanstack/react-table";

import { ProductWithImages } from "@/features/products/types";
import { logger } from "@/shared/utils/logger";


import { useState } from "react";
import { Trash2 } from "lucide-react";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleMassDelete = async () => {
    logger.log("Mass delete initiated.");
    const selectedProductIds = table
      .getSelectedRowModel()
      .rows.map((row) => (row.original as ProductWithImages)?.id)
      .filter(Boolean);

    if (selectedProductIds.length === 0) {
      setActionError("Please select products to delete.");
      return;
    }

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
          const firstFailed = failedDeletions[0];
          if (firstFailed) {
            const payload = (await firstFailed.json()) as {
              errorId?: string;
            };
            if (payload?.errorId) {
              errorIdSuffix = ` (Error ID: ${payload.errorId})`;
            }
          }
        } catch {
          errorIdSuffix = "";
        }
        setActionError(`Some products could not be deleted.${errorIdSuffix}`);
        toast("Some products could not be deleted", {
          variant: "error",
        });
      } else {
        toast("Selected products deleted successfully.", {
          variant: "success",
        });
      }
      table.setRowSelection({}); // Clear selection after deletion
      setRefreshTrigger((prev) => prev + 1); // Refresh the product list
      setShowDeleteConfirm(false);
    } catch (error) {
      logger.error("Error during mass deletion:", error);
      setActionError("An error occurred during deletion.");
      toast("An error occurred during deletion", {
        variant: "error",
      });
    }
  };

  return (
    <>
      <div className="space-y-3 border-t bg-muted/50 px-4 py-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedCount}</span>{" "}
            of <span className="font-medium text-foreground">{table.getFilteredRowModel().rows.length}</span>{" "}
            row(s) selected.
          </div>
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!hasSelection}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedCount})
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected products?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} selected{" "}
              {selectedCount === 1 ? "product" : "products"}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleMassDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}) as <TData>(props: ProductTableFooterProps<TData>) => React.JSX.Element;
