'use client';

import dynamic from 'next/dynamic';

import { TriggerButtonBar } from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { ListProductModal } from '@/features/integrations/components/listings/ListProductModal';
import { MassListProductModal } from '@/features/integrations/components/listings/MassListProductModal';
import { ProductListingsModal } from '@/features/integrations/components/listings/ProductListingsModal';
import ProductForm from '@/features/products/components/ProductForm';
import { ProductFormProvider, useProductFormContext } from '@/features/products/context/ProductFormContext';
import { useProductListModalsContext } from '@/features/products/context/ProductListContext';
import { AppModal, Button } from '@/shared/ui';


const FileManager = dynamic(() => import('@/features/files/components/FileManager'), {
  ssr: false,
});

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
            open={isCreateOpen}
            onClose={onCloseCreate}
            title='Create Product'
            submitButtonText='Create'
            closeOnSubmit
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
            open={!!editingProduct}
            onClose={onCloseEdit}
            title='Edit Product'
            submitButtonText='Update'
            closeOnSubmit={false}
            validationInstanceScopeOverride='product_edit'
          />
        </ProductFormProvider>
      )}

      <AppModal
        open={!!integrationsProduct && !showListProductModal}
        onClose={onCloseIntegrations}
        title='Product Listings'
        size='md'
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
        title='List Product'
        size='md'
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
        title='Export Settings'
        size='md'
      >
        {exportSettingsProduct && onCloseExportSettings && (
          <ProductListingsModal
            product={exportSettingsProduct}
            onClose={onCloseExportSettings}
            filterIntegrationSlug='baselinker'
            onListingsUpdated={onListingsUpdated}
          />
        )}
      </AppModal>

      <AppModal
        open={!!massListIntegration && !!massListProductIds && massListProductIds.length > 0}
        onClose={() => onCloseMassList?.()}
        title='Mass List Products'
        size='md'
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
  closeOnSubmit: _closeOnSubmit = false,
  validationInstanceScopeOverride,
}: { 
  open: boolean;
  onClose: () => void;
  title: string;
  submitButtonText: string;
  closeOnSubmit?: boolean;
  validationInstanceScopeOverride?: 'draft_template' | 'product_create' | 'product_edit';
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
    <div className='flex items-center justify-between gap-3'>
      <div className='flex items-center gap-4'>
        <Button
          onClick={() => {
            void handleSubmit();
          }}
          disabled={uploading}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          {uploading ? 'Saving...' : submitButtonText}
        </Button>
        <div className='flex items-center gap-2'>
          <h2 className='text-2xl font-bold text-white'>{title}</h2>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <TriggerButtonBar
          location='product_modal'
          entityType='product'
          entityId={product?.id ?? null}
          getEntityJson={getEntityJson}
        />
        <Button
          type='button'
          onClick={onClose}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
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
      className='md:min-w-[63rem] max-w-[66rem]'
    >
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm
          submitButtonText={submitButtonText}
          {...(
            validationInstanceScopeOverride
              ? { validationInstanceScopeOverride }
              : {}
          )}
        />
      )}
    </AppModal>
  );
}
