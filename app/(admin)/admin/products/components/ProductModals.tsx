"use client";

import React from "react";
import ModalShell from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import FileManager from "@/components/files/FileManager";
import ProductForm from "@/components/products/ProductForm";
import ProductListingsModal from "@/components/products/ProductListingsModal";
import ListProductModal from "@/components/products/ListProductModal";
import {
  ProductFormProvider,
  useProductFormContext,
} from "@/lib/context/ProductFormContext";
import type { ProductWithImages } from "@/types";

interface ProductModalsProps {
  isCreateOpen: boolean;
  initialSku: string;
  initialCatalogId?: string | undefined;
  onCloseCreate: () => void;
  onCreateSuccess: () => void;
  editingProduct: ProductWithImages | null;
  onCloseEdit: () => void;
  onEditSuccess: () => void;
  integrationsProduct: ProductWithImages | null;
  onCloseIntegrations: () => void;
  showListProductModal: boolean;
  onOpenListProduct: () => void;
  onCloseListProduct: () => void;
  onListProductSuccess: () => void;
  // Export settings (opened via Store icon)
  exportSettingsProduct?: ProductWithImages | null;
  onCloseExportSettings?: () => void;
  onExportSettingsSuccess?: () => void;
}

function CreateProductModalContent({ onClose }: { onClose: () => void }) {
  const { showFileManager, handleMultiFileSelect, handleSubmit, uploading } =
    useProductFormContext();

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSubmit}
          disabled={uploading}
          className="min-w-[100px]"
        >
          {uploading ? "Saving..." : "Create"}
        </Button>
        <h2 className="text-2xl font-bold text-white">Product</h2>
      </div>
      <Button
        type="button"
        onClick={onClose}
        className="bg-gray-800 text-white hover:bg-gray-700"
      >
        Close
      </Button>
    </div>
  );

  return (
    <ModalShell title="Create Product" onClose={onClose} header={header}>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm submitButtonText="Create" />
      )}
    </ModalShell>
  );
}

function EditProductModalContent({ onClose }: { onClose: () => void }) {
  const { showFileManager, handleMultiFileSelect, handleSubmit, uploading } =
    useProductFormContext();

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSubmit}
          disabled={uploading}
          className="min-w-[100px]"
        >
          {uploading ? "Saving..." : "Update"}
        </Button>
        <h2 className="text-2xl font-bold text-white">Product</h2>
      </div>
      <Button
        type="button"
        onClick={onClose}
        className="bg-gray-800 text-white hover:bg-gray-700"
      >
        Close
      </Button>
    </div>
  );

  return (
    <ModalShell title="Edit Product" onClose={onClose} header={header}>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm submitButtonText="Update" />
      )}
    </ModalShell>
  );
}

export function ProductModals({
  isCreateOpen: isCreateOpen,
  initialSku,
  initialCatalogId,
  onCloseCreate,
  onCreateSuccess,
  editingProduct,
  onCloseEdit,
  onEditSuccess,
  integrationsProduct,
  onCloseIntegrations,
  showListProductModal,
  onOpenListProduct,
  onCloseListProduct,
  onListProductSuccess,
  exportSettingsProduct,
  onCloseExportSettings,
  onExportSettingsSuccess,
}: ProductModalsProps) {
  return (
    <>
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onCloseCreate}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProductFormProvider
              onSuccess={onCreateSuccess}
              initialSku={initialSku}
              initialCatalogId={initialCatalogId}
            >
              <CreateProductModalContent onClose={onCloseCreate} />
            </ProductFormProvider>
          </div>
        </div>
      )}

      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onCloseEdit}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProductFormProvider
              product={editingProduct}
              onSuccess={onEditSuccess}
            >
              <EditProductModalContent onClose={onCloseEdit} />
            </ProductFormProvider>
          </div>
        </div>
      )}

      {integrationsProduct && !showListProductModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onCloseIntegrations}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProductListingsModal
              product={integrationsProduct}
              onClose={onCloseIntegrations}
              onListProduct={onOpenListProduct}
            />
          </div>
        </div>
      )}

      {integrationsProduct && showListProductModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onCloseListProduct}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ListProductModal
              product={integrationsProduct}
              onClose={onCloseListProduct}
              onSuccess={onListProductSuccess}
            />
          </div>
        </div>
      )}

      {exportSettingsProduct && onCloseExportSettings && onExportSettingsSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onCloseExportSettings}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ListProductModal
              product={exportSettingsProduct}
              onClose={onCloseExportSettings}
              onSuccess={onExportSettingsSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
}
