"use client";

import React from "react";
import ModalShell from "@/shared/ui/modal-shell";
import { Button } from "@/shared/ui/button";
import FileManager from "@/components/files/FileManager";
import ProductForm from "@/features/products/components/ProductForm";
import ProductListingsModal from "@/features/products/components/modals/ProductListingsModal";
import ListProductModal from "@/features/products/components/modals/ListProductModal";
import MassListProductModal from "@/features/products/components/modals/MassListProductModal";
import {
  ProductFormProvider,
  useProductFormContext,
} from "@/lib/context/ProductFormContext";
import type { ProductWithImages } from "@/types";
import type { ProductDraft } from "@/types/drafts";

interface ProductModalsProps {
  isCreateOpen: boolean;
  initialSku: string;
  createDraft?: ProductDraft | null;
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

import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";

function ProductFormModalContent({ 
  onClose, 
  title, 
  submitButtonText 
}: { 
  onClose: () => void;
  title: string;
  submitButtonText: string;
}) {
  const { showFileManager, handleMultiFileSelect, handleSubmit, uploading } =
    useProductFormContext();

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => void handleSubmit()}
          disabled={uploading}
          className="min-w-[100px] border border-white/20 hover:border-white/40"
        >
          {uploading ? "Saving..." : submitButtonText}
        </Button>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <Button
        type="button"
        onClick={onClose}
        className="min-w-[100px] border border-white/20 hover:border-white/40"
      >
        Close
      </Button>
    </div>
  );

  return (
    <ModalShell title={title} onClose={onClose} header={header}>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm submitButtonText={submitButtonText} />
      )}
    </ModalShell>
  );
}

export function ProductModals({
  isCreateOpen,
  initialSku,
  createDraft,
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
  return (
    <>
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && onCloseCreate()}>
        <DialogContent className="max-w-none w-auto p-0 border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">Create Product</DialogTitle>
          <ProductFormProvider
            key={createDraft?.id ?? "create"}
            onSuccess={onCreateSuccess}
            initialSku={initialSku}
            draft={createDraft ?? undefined}
          >
            <ProductFormModalContent 
              onClose={onCloseCreate} 
              title="Create Product" 
              submitButtonText="Create" 
            />
          </ProductFormProvider>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && onCloseEdit()}>
        <DialogContent className="max-w-none w-auto p-0 border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">Edit Product</DialogTitle>
          {editingProduct && (
            <ProductFormProvider
              product={editingProduct}
              onSuccess={onEditSuccess}
              onEditSave={onEditSave}
            >
              <ProductFormModalContent 
                onClose={onCloseEdit} 
                title="Edit Product" 
                submitButtonText="Update" 
              />
            </ProductFormProvider>
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={!!integrationsProduct && !showListProductModal} 
        onOpenChange={(open) => !open && onCloseIntegrations()}
      >
        <DialogContent className="max-w-none w-auto p-0 border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">Product Listings</DialogTitle>
          {integrationsProduct && (
            <ProductListingsModal
              product={integrationsProduct}
              onClose={onCloseIntegrations}
              onStartListing={onStartListing}
              onListingsUpdated={onListingsUpdated}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={!!integrationsProduct && showListProductModal} 
        onOpenChange={(open) => !open && onCloseListProduct()}
      >
        <DialogContent className="max-w-none w-auto p-0 border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">List Product</DialogTitle>
          {integrationsProduct && (
            <ListProductModal
              product={integrationsProduct}
              onClose={onCloseListProduct}
              onSuccess={onListProductSuccess}
              initialIntegrationId={listProductPreset?.integrationId ?? null}
              initialConnectionId={listProductPreset?.connectionId ?? null}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={!!exportSettingsProduct && !!onCloseExportSettings} 
        onOpenChange={(open) => !open && onCloseExportSettings?.()}
      >
        <DialogContent className="max-w-none w-auto p-0 border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">Export Settings</DialogTitle>
          {exportSettingsProduct && onCloseExportSettings && (
            <ProductListingsModal
              product={exportSettingsProduct}
              onClose={onCloseExportSettings}
              filterIntegrationSlug="baselinker"
              onListingsUpdated={onListingsUpdated}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={!!massListIntegration && !!massListProductIds && massListProductIds.length > 0} 
        onOpenChange={(open) => !open && onCloseMassList?.()}
      >
        <DialogContent className="max-w-none w-auto p-0 border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">Mass List Products</DialogTitle>
          {massListIntegration && massListProductIds && onCloseMassList && onMassListSuccess && (
            <MassListProductModal
              integrationId={massListIntegration.integrationId}
              connectionId={massListIntegration.connectionId}
              productIds={massListProductIds}
              onClose={onCloseMassList}
              onSuccess={onMassListSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

