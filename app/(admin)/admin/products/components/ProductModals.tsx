"use client";

import React from "react";
import ModalShell from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import FileManager from "@/components/files/FileManager";
import ProductForm from "@/components/products/ProductForm";
import ProductListingsModal from "@/components/products/modals/ProductListingsModal";
import ListProductModal from "@/components/products/modals/ListProductModal";
import MassListProductModal from "@/components/products/modals/MassListProductModal";
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
  // Mass Listing
  massListIntegration?: { integrationId: string; connectionId: string } | null;
  massListProductIds?: string[];
  onCloseMassList?: () => void;
  onMassListSuccess?: () => void;
}

function CreateProductModalContent({ onClose }: { onClose: () => void }) {
  const { showFileManager, handleMultiFileSelect, handleSubmit, uploading } =
    useProductFormContext();

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => void handleSubmit()}
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
          onClick={() => void handleSubmit()}
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
  massListIntegration,
  massListProductIds,
  onCloseMassList,
  onMassListSuccess,
}: ProductModalsProps) {
  const isBackdropMouseDownRef = React.useRef(false);

  const handleBackdropMouseDown = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    isBackdropMouseDownRef.current = event.target === event.currentTarget;
  };

  const handleBackdropMouseUp =
    (onClose: () => void) => (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && isBackdropMouseDownRef.current) {
        onClose();
      }
      isBackdropMouseDownRef.current = false;
    };

  return (
    <>
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp(onCloseCreate)}
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
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp(onCloseEdit)}
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
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp(onCloseIntegrations)}
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
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp(onCloseListProduct)}
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
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp(onCloseExportSettings)}
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

      {massListIntegration && massListProductIds && massListProductIds.length > 0 && onCloseMassList && onMassListSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp(onCloseMassList)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <MassListProductModal
              integrationId={massListIntegration.integrationId}
              connectionId={massListIntegration.connectionId}
              productIds={massListProductIds}
              onClose={onCloseMassList}
              onSuccess={onMassListSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
}
