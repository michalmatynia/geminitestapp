"use client";

import React from "react";
import ModalShell from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import FileManager from "@/components/files/FileManager";
import ProductForm from "@/components/products/ProductForm";
import ProductListingsModal from "@/components/products/ProductListingsModal";
import ListProductModal from "@/components/products/ListProductModal";
import SelectProductForListingModal from "@/components/products/SelectProductForListingModal";
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
  onEditSave: (saved: ProductWithImages) => void;
  integrationsProduct: ProductWithImages | null;
  onCloseIntegrations: () => void;
  onStartListing: (integrationId: string, connectionId: string) => void;
  showListProductModal: boolean;
  onCloseListProduct: () => void;
  onListProductSuccess: () => void;
  listProductPreset: { integrationId: string; connectionId: string } | null;
  // Export settings (opened via Store icon)
  exportSettingsProduct?: ProductWithImages | null;
  onCloseExportSettings?: () => void;
  onListingsUpdated?: () => void;
  // Header integration selection (from + button dropdown)
  selectedHeaderIntegration?: { integrationId: string; connectionId: string } | null;
  onCloseHeaderIntegration?: () => void;
  onHeaderIntegrationSuccess?: () => void;
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
  onEditSave,
  integrationsProduct,
  onCloseIntegrations,
  onStartListing,
  showListProductModal,
  onCloseListProduct,
  onListProductSuccess,
  listProductPreset,
  exportSettingsProduct,
  onCloseExportSettings,
  onListingsUpdated,
  selectedHeaderIntegration,
  onCloseHeaderIntegration,
  onHeaderIntegrationSuccess,
}: ProductModalsProps) {
  return (
    <>
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onCloseCreate}
          onMouseDown={(e) => {
            // Only allow close if clicking directly on backdrop
            if (e.target !== e.currentTarget) e.stopPropagation();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
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
          onMouseDown={(e) => {
            // Only allow close if clicking directly on backdrop
            if (e.target !== e.currentTarget) e.stopPropagation();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ProductFormProvider
              product={editingProduct}
              onSuccess={onEditSuccess}
              onEditSave={onEditSave}
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
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) e.stopPropagation();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ProductListingsModal
              product={integrationsProduct}
              onClose={onCloseIntegrations}
              onStartListing={onStartListing}
              onListingsUpdated={onListingsUpdated}
            />
          </div>
        </div>
      )}

      {integrationsProduct && showListProductModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onCloseListProduct}
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) e.stopPropagation();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ListProductModal
              product={integrationsProduct}
              onClose={onCloseListProduct}
              onSuccess={onListProductSuccess}
              initialIntegrationId={listProductPreset?.integrationId ?? null}
              initialConnectionId={listProductPreset?.connectionId ?? null}
            />
          </div>
        </div>
      )}

      {exportSettingsProduct && onCloseExportSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onCloseExportSettings}
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) e.stopPropagation();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ProductListingsModal
              product={exportSettingsProduct}
              onClose={onCloseExportSettings}
              filterIntegrationSlug="baselinker"
              onListingsUpdated={onListingsUpdated}
            />
          </div>
        </div>
      )}

      {selectedHeaderIntegration && onCloseHeaderIntegration && onHeaderIntegrationSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onCloseHeaderIntegration}
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) e.stopPropagation();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <SelectProductForListingModal
              integrationId={selectedHeaderIntegration.integrationId}
              connectionId={selectedHeaderIntegration.connectionId}
              onClose={onCloseHeaderIntegration}
              onSuccess={onHeaderIntegrationSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
}
