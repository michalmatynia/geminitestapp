"use client";
import React, { JSX, memo, useState } from "react";

import { Button, useToast, ConfirmDialog } from "@/shared/ui";
import { Table as ReactTable, Row } from "@tanstack/react-table";

import { ProductWithImages } from "@/features/products/types";
import { logger } from "@/shared/utils/logger";


import { Trash2, Image as ImageIcon } from "lucide-react";

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
  const [showBase64Confirm, setShowBase64Confirm] = useState(false);

  const handleMassDelete = async (): Promise<void> => {
    logger.log("Mass delete initiated.");
    const selectedProductIds = table
      .getSelectedRowModel()
      .rows.map((row: Row<TData>) => (row.original as ProductWithImages)?.id)
      .filter(Boolean);

    if (selectedProductIds.length === 0) {
      setActionError("Please select products to delete.");
      return;
    }

    try {
      const deletePromises = selectedProductIds.map((id: string) =>
        fetch(`/api/products/${id}`, {
          method: "DELETE",
        })
      );
      const results = await Promise.all(deletePromises);

      const failedDeletions = results.filter((res: Response) => !res.ok);

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
      setRefreshTrigger((prev: number) => prev + 1); // Refresh the product list
      setShowDeleteConfirm(false);
    } catch (error) {
      logger.error("Error during mass deletion:", error);
      setActionError("An error occurred during deletion.");
      toast("An error occurred during deletion", {
        variant: "error",
      });
    }
  };

  const handleMassBase64 = async (): Promise<void> => {
    const selectedProductIds = table
      .getSelectedRowModel()
      .rows.map((row: Row<TData>) => (row.original as ProductWithImages)?.id)
      .filter(Boolean);

    if (selectedProductIds.length === 0) {
      setActionError("Please select products to convert.");
      return;
    }

    try {
      const res = await fetch("/api/products/images/base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedProductIds }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to convert images");
      }
      toast("Base64 images generated for selected products.", {
        variant: "success",
      });
      table.setRowSelection({});
      setRefreshTrigger((prev: number) => prev + 1);
      setShowBase64Confirm(false);
    } catch (error) {
      logger.error("Error during base64 conversion:", error);
      setActionError("An error occurred during base64 conversion.");
      toast("An error occurred during base64 conversion", {
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
          <Button
            onClick={() => setShowBase64Confirm(true)}
            disabled={!hasSelection}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            Base64 Images ({selectedCount})
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete selected products?"
        description={`Are you sure you want to delete ${selectedCount} selected ${selectedCount === 1 ? "product" : "products"}? This action cannot be undone.`}
        onConfirm={() => void handleMassDelete()}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={showBase64Confirm}
        onOpenChange={setShowBase64Confirm}
        title="Generate Base64 images?"
        description={`Create Base64-encoded image links for ${selectedCount} selected ${selectedCount === 1 ? "product" : "products"}? This can be heavy for large images.`}
        onConfirm={() => void handleMassBase64()}
        confirmText="Convert"
        variant="success"
      />
    </>
  );
}) as <TData>(props: ProductTableFooterProps<TData>) => JSX.Element;
