"use client";
import { ModalShell, Button, AppModal } from "@/shared/ui";
import React from "react";



import { FileManager } from "@/features/files";
import ProductForm from "@/features/products/components/ProductForm";
import { ProductListingsModal } from "@/features/integrations";
import { ListProductModal } from "@/features/integrations";
import { MassListProductModal } from "@/features/integrations";
import {
  ProductFormProvider,
  useProductFormContext,
} from "@/features/products/context/ProductFormContext";
import type { ProductWithImages } from "@/features/products/types";
import type { ProductDraft } from "@/features/products/types/drafts";

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
      <AppModal
        open={isCreateOpen}
        onOpenChange={(open) => !open && onCloseCreate()}
        title="Create Product"
      >
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
      </AppModal>

      <AppModal
        open={!!editingProduct}
        onOpenChange={(open) => !open && onCloseEdit()}
        title="Edit Product"
      >
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
      </AppModal>

      <AppModal
        open={!!integrationsProduct && !showListProductModal}
        onOpenChange={(open) => !open && onCloseIntegrations()}
        title="Product Listings"
      >
        {integrationsProduct && (
          <ProductListingsModal
            product={integrationsProduct}
            onClose={onCloseIntegrations}
            onStartListing={onStartListing}
            onListingsUpdated={onListingsUpdated}
          />
        )}
      </AppModal>

      <AppModal
        open={!!integrationsProduct && showListProductModal}
        onOpenChange={(open) => !open && onCloseListProduct()}
        title="List Product"
      >
        {integrationsProduct && (
          <ListProductModal
            product={integrationsProduct}
            onClose={onCloseListProduct}
            onSuccess={onListProductSuccess}
            initialIntegrationId={listProductPreset?.integrationId ?? null}
            initialConnectionId={listProductPreset?.connectionId ?? null}
          />
        )}
      </AppModal>

      <AppModal
        open={!!exportSettingsProduct && !!onCloseExportSettings}
        onOpenChange={(open) => !open && onCloseExportSettings?.()}
        title="Export Settings"
      >
        {exportSettingsProduct && onCloseExportSettings && (
          <ProductListingsModal
            product={exportSettingsProduct}
            onClose={onCloseExportSettings}
            filterIntegrationSlug="baselinker"
            onListingsUpdated={onListingsUpdated}
          />
        )}
      </AppModal>

      <AppModal
        open={!!massListIntegration && !!massListProductIds && massListProductIds.length > 0}
        onOpenChange={(open) => !open && onCloseMassList?.()}
        title="Mass List Products"
      >
        {massListIntegration && massListProductIds && onCloseMassList && onMassListSuccess && (
          <MassListProductModal
            integrationId={massListIntegration.integrationId}
            connectionId={massListIntegration.connectionId}
            productIds={massListProductIds}
            onClose={onCloseMassList}
            onSuccess={onMassListSuccess}
          />
        )}
      </AppModal>
    </>
  );
}
