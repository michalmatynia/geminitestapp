"use client";
import { AppModal, Button } from "@/shared/ui";
import dynamic from "next/dynamic";

const FileManager = dynamic(() => import("@/features/files/components/FileManager"), {
  ssr: false,
  loading: () => <div>Loading file manager...</div>
});
import ProductForm from "@/features/products/components/ProductForm";
import { ProductListingsModal } from "@/features/integrations/components/listings/ProductListingsModal";
import { ListProductModal } from "@/features/integrations/components/listings/ListProductModal";
import { MassListProductModal } from "@/features/integrations/components/listings/MassListProductModal";
import {
  ProductFormProvider,
  useProductFormContext,
} from "@/features/products/context/ProductFormContext";
import type { ProductWithImages } from "@/features/products/types";
import type { ProductDraft } from "@/features/products/types/drafts";
import { TriggerButtonBar } from "@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar";

interface ProductModalsProps {
  isCreateOpen: boolean;
  initialSku: string;
  createDraft?: ProductDraft | null;
  initialCatalogId?: string | null;
  onCloseCreate: () => void;
  onCreateSuccess: (info?: { queued?: boolean }) => void;
  editingProduct: ProductWithImages | null;
  onCloseEdit: () => void;
  onEditSuccess: (info?: { queued?: boolean }) => void;
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

export function ProductModals({
  isCreateOpen,
  initialSku,
  createDraft,
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
}: ProductModalsProps): React.JSX.Element {
  return (
    <>
      {isCreateOpen && (
        <ProductFormProvider
          key={createDraft?.id ?? "create"}
          onSuccess={onCreateSuccess}
          initialSku={initialSku}
          initialCatalogId={initialCatalogId ?? undefined}
          draft={createDraft ?? undefined}
        >
          <ProductFormModal
            open={isCreateOpen}
            onClose={onCloseCreate}
            title="Create Product"
            submitButtonText="Create"
            closeOnSubmit
          />
        </ProductFormProvider>
      )}

      {editingProduct && (
        <ProductFormProvider
          product={editingProduct}
          onSuccess={onEditSuccess}
          onEditSave={onEditSave}
        >
          <ProductFormModal
            open={!!editingProduct}
            onClose={onCloseEdit}
            title="Edit Product"
            submitButtonText="Update"
            closeOnSubmit={false}
          />
        </ProductFormProvider>
      )}

      <AppModal
        open={!!integrationsProduct && !showListProductModal}
        onClose={onCloseIntegrations}
        title="Product Listings"
        size="md"
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
        onClose={onCloseListProduct}
        title="List Product"
        size="md"
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
        onClose={() => onCloseExportSettings?.()}
        title="Export Settings"
        size="md"
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
        onClose={() => onCloseMassList?.()}
        title="Mass List Products"
        size="md"
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

function ProductFormModal({ 
  open,
  onClose, 
  title, 
  submitButtonText,
  closeOnSubmit = false,
}: { 
  open: boolean;
  onClose: () => void;
  title: string;
  submitButtonText: string;
  closeOnSubmit?: boolean;
}): React.JSX.Element {
  const { showFileManager, handleMultiFileSelect, handleSubmit, uploading, getValues, product } =
    useProductFormContext();

  const getEntityJson = (): Record<string, unknown> => {
    const values = getValues() as unknown as Record<string, unknown>;
    const base = (product ?? {}) as unknown as Record<string, unknown>;
    return {
      ...base,
      ...values,
      ...(product?.id ? { id: product.id } : {}),
    };
  };

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => {
            void handleSubmit();
            if (closeOnSubmit) {
              onClose();
            }
          }}
          disabled={uploading}
          className="min-w-[100px] border border-white/20 hover:border-white/40"
        >
          {uploading ? "Saving..." : submitButtonText}
        </Button>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <TriggerButtonBar
          location="product_modal"
          entityType="product"
          entityId={product?.id ?? null}
          getEntityJson={getEntityJson}
        />
        <Button
          type="button"
          onClick={onClose}
          className="min-w-[100px] border border-white/20 hover:border-white/40"
        >
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <AppModal 
      open={open}
      onClose={onClose}
      title={title} 
      header={header}
      className="md:min-w-[52rem] max-w-[55rem]"
    >
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm submitButtonText={submitButtonText} />
      )}
    </AppModal>
  );
}
