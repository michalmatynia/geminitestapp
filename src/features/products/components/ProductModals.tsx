'use client';

import dynamic from 'next/dynamic';

import { ListProductModal } from '@/features/integrations/components/listings/ListProductModal';
import { MassListProductModal } from '@/features/integrations/components/listings/MassListProductModal';
import { ProductListingsModal } from '@/features/integrations/components/listings/ProductListingsModal';
import { ProductFormProvider } from '@/features/products/context/ProductFormContext';
import { useProductListModalsContext } from '@/features/products/context/ProductListContext';
import { AppModal } from '@/shared/ui';

import { ProductFormModal } from './modals/ProductFormModal';


const SelectIntegrationModal = dynamic(
  () => import('@/features/integrations/components/listings/SelectIntegrationModal'),
  {
    ssr: false,
  }
);

export function ProductModals(): React.JSX.Element {
  const {
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
    showIntegrationModal,
    onCloseIntegrationModal,
    onSelectIntegrationFromModal,
  } = useProductListModalsContext();

  return (
    <>
      {isCreateOpen && (
        <ProductFormProvider
          key={createDraft?.id ?? 'create'}
          onSuccess={onCreateSuccess}
          initialSku={initialSku}
          initialCatalogId={initialCatalogId ?? undefined}
          draft={createDraft ?? undefined}
        >
          <ProductFormModal
            isOpen={isCreateOpen}
            onClose={onCloseCreate}
            title='Create Product'
            submitButtonText='Create'
            validationInstanceScopeOverride={createDraft?.id ? 'draft_template' : 'product_create'}
          />
        </ProductFormProvider>
      )}

      {editingProduct && (
        <ProductFormProvider
          key={editingProduct.id}
          product={editingProduct}
          onSuccess={onEditSuccess}
          onEditSave={onEditSave}
        >
          <ProductFormModal
            isOpen={!!editingProduct}
            onClose={onCloseEdit}
            title='Edit Product'
            submitButtonText='Update'
            validationInstanceScopeOverride='product_edit'
          />
        </ProductFormProvider>
      )}

      {integrationsProduct && !showListProductModal && (
        <ProductListingsModal
          isOpen={!!integrationsProduct}
          item={integrationsProduct}
          onClose={onCloseIntegrations}
          onStartListing={onStartListing}
          onListingsUpdated={onListingsUpdated}
        />
      )}

      {integrationsProduct && showListProductModal && (
        <ListProductModal
          isOpen={!!integrationsProduct}
          item={integrationsProduct}
          onClose={onCloseListProduct}
          onSuccess={onListProductSuccess}
          initialIntegrationId={listProductPreset?.integrationId ?? null}
          initialConnectionId={listProductPreset?.connectionId ?? null}
        />
      )}

      {exportSettingsProduct && onCloseExportSettings && (
        <ProductListingsModal
          isOpen={!!exportSettingsProduct}
          item={exportSettingsProduct}
          onClose={onCloseExportSettings}
          filterIntegrationSlug='baselinker'
          onListingsUpdated={onListingsUpdated}
        />
      )}

      <AppModal
        open={!!massListIntegration && !!massListProductIds && massListProductIds.length > 0}
        onClose={() => onCloseMassList?.()}
        title='Mass List Products'
        size='md'
      >
        {massListIntegration && massListProductIds && onCloseMassList && onMassListSuccess && (
          <MassListProductModal
            isOpen={true}
            onSuccess={onMassListSuccess}
            integrationId={massListIntegration.integrationId}
            connectionId={massListIntegration.connectionId}
            item={massListProductIds}
            onClose={onCloseMassList}
          />
        )}
      </AppModal>

      {showIntegrationModal && (
        <SelectIntegrationModal
          isOpen={showIntegrationModal}
          onSuccess={() => {}}
          onClose={onCloseIntegrationModal}
          onSelect={onSelectIntegrationFromModal}
        />
      )}
    </>
  );
}
