"use client";

import { useState } from "react";
import { useToast } from "@/shared/ui/toast";
import type { ProductWithImages } from "@/types";
import type { ProductDraft } from "@/types/drafts";

export function useProductOperations(setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>) {
  const { toast } = useToast();
  
  // UI State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialSku, setInitialSku] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<ProductWithImages | null>(null);
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenCreateModal = async () => {
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
        const payload = (await res.json()) as { error?: string };
        setActionError(payload?.error || "Failed to validate SKU");
        return;
      }
      const products = (await res.json()) as ProductWithImages[];
      if (products.some((p) => p.sku === sku)) {
        setActionError("SKU already exists.");
        return;
      }
    } catch (error) {
      console.error("Failed to validate SKU:", error);
      setActionError("Failed to validate SKU. Please try again.");
      return;
    }
    setInitialSku(sku);
    setIsCreateOpen(true);
  };

  const handleOpenCreateFromDraft = (draft: ProductDraft) => {
    const draftSku = typeof draft.sku === "string" ? draft.sku.trim().toUpperCase() : "";
    setInitialSku(draftSku);
    setIsCreateOpen(true);
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    setInitialSku("");
    setRefreshTrigger((prev) => prev + 1);
    toast("Product created successfully.", { variant: "success" });
  };

  const handleEditSuccess = () => {
    if (editingProduct) {
      setLastEditedId(editingProduct.id);
    }
    setEditingProduct(null);
    setRefreshTrigger((prev) => prev + 1);
    toast("Product updated successfully.", { variant: "success" });
  };

  const handleEditSave = (savedProduct: ProductWithImages) => {
    setLastEditedId(savedProduct.id);
    setRefreshTrigger((prev) => prev + 1);
  };

  return {
    isCreateOpen,
    setIsCreateOpen,
    initialSku,
    setInitialSku,
    editingProduct,
    setEditingProduct,
    lastEditedId,
    actionError,
    setActionError,
    handleOpenCreateModal,
    handleOpenCreateFromDraft,
    handleCreateSuccess,
    handleEditSuccess,
    handleEditSave,
  };
}