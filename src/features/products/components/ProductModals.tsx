'use client';

import dynamic from 'next/dynamic';

import { ListProductModal } from '@/features/integrations/components/listings/ListProductModal';
import { MassListProductModal } from '@/features/integrations/components/listings/MassListProductModal';
import { ProductListingsModal } from '@/features/integrations/components/listings/ProductListingsModal';
import { ProductFormProvider } from '@/features/products/context/ProductFormContext';
import { isEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import { useProductListModalsContext } from '@/features/products/context/ProductListContext';
import { FormModal, Skeleton } from '@/shared/ui';

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
    isEditHydrating,
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

  const hydratedEditingProduct =
    editingProduct && isEditingProductHydrated(editingProduct) ? editingProduct : null;
  const showEditLoadingModal = isEditHydrating || (Boolean(editingProduct) && !hydratedEditingProduct);
  const editProviderKey = hydratedEditingProduct
    ? [
      hydratedEditingProduct.id,
      'hydrated',
      hydratedEditingProduct.updatedAt ?? '',
    ].join(':')
    : null;

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

      {showEditLoadingModal && (
        <FormModal
          open={showEditLoadingModal}
          onClose={onCloseEdit}
          title='Edit Product'
          subtitle='Loading full product details before editing.'
          onSave={() => {}}
          isSaveDisabled
          hasUnsavedChanges={false}
          saveText='Update'
          cancelText='Close'
          size='xl'
          className='md:min-w-[63rem] max-w-[66rem]'
        >
          <div className='space-y-6 py-2'>
            <div className='rounded-lg border border-border/60 p-4 space-y-3'>
              <Skeleton className='h-4 w-52' />
              <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
                <Skeleton className='h-9 w-full' />
                <Skeleton className='h-9 w-full' />
                <Skeleton className='h-9 w-full' />
              </div>
            </div>
            <div className='rounded-lg border border-border/60 p-4 space-y-3'>
              <Skeleton className='h-4 w-44' />
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-20 w-full' />
            </div>
            <p className='text-sm text-muted-foreground'>
              Please wait while complete product data is loaded.
            </p>
          </div>
        </FormModal>
      )}

      {hydratedEditingProduct && editProviderKey && (
        <ProductFormProvider
          key={editProviderKey}
          product={hydratedEditingProduct}
          onSuccess={onEditSuccess}
          onEditSave={onEditSave}
          requireHydratedEditProduct
        >
          <ProductFormModal
            isOpen={!!hydratedEditingProduct}
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

      {massListIntegration && massListProductIds && massListProductIds.length > 0 && (
        <MassListProductModal
          isOpen={true}
          onSuccess={onMassListSuccess ?? (() => {})}
          integrationId={massListIntegration.integrationId}
          connectionId={massListIntegration.connectionId}
          item={massListProductIds}
          onClose={onCloseMassList ?? (() => {})}
        />
      )}

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
