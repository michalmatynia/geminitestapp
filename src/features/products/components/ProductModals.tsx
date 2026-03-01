'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ListProductModal } from '@/features/integrations/components/listings/ListProductModal';
import { MassListProductModal } from '@/features/integrations/components/listings/MassListProductModal';
import { ProductListingsModal } from '@/features/integrations/components/listings/ProductListingsModal';
import { ProductFormProvider } from '@/features/products/context/ProductFormContext';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { isEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import { useProductListModalsContext } from '@/features/products/context/ProductListContext';
import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';
import type { ProductWithImages } from '@/shared/contracts/products';
import { FormModal, Skeleton } from '@/shared/ui';

import ProductForm from './ProductForm';
import { ProductFormModal } from './modals/ProductFormModal';

const FileManager = dynamic(() => import('@/features/files/components/FileManager'), {
  ssr: false,
});

const SelectIntegrationModal = dynamic(
  () => import('@/features/integrations/components/listings/SelectIntegrationModal'),
  {
    ssr: false,
  }
);

// ─── Form bridge ────────────────────────────────────────────────────────────
// Rendered inside ProductFormProvider; syncs form state into refs/setState
// owned by the outer EditProductModal so the shared FormModal shell can react.

function ProductFormEditBridge({
  onIsSavingChange,
  onHasUnsavedChangesChange,
  submitRef,
}: {
  onIsSavingChange: (v: boolean) => void;
  onHasUnsavedChangesChange: (v: boolean) => void;
  submitRef: React.MutableRefObject<(() => void) | null>;
}): null {
  const { handleSubmit, uploading, hasUnsavedChanges } = useProductFormContext();

  // Keep submit ref always fresh (no deps needed — render-time assignment is fine for refs)
  submitRef.current = () => {
    void handleSubmit();
  };

  useEffect(() => {
    onIsSavingChange(uploading);
  }, [uploading, onIsSavingChange]);

  useEffect(() => {
    onHasUnsavedChangesChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onHasUnsavedChangesChange]);

  return null;
}

// ─── Form body content ───────────────────────────────────────────────────────
// Extracted from ProductFormModalInner so it can live inside the shared
// FormModal shell without nesting a second Dialog.

function ProductFormEditBody({
  submitButtonText,
  validationInstanceScopeOverride,
}: {
  submitButtonText: string;
  validationInstanceScopeOverride?: 'draft_template' | 'product_create' | 'product_edit';
}): React.JSX.Element {
  const { showFileManager, handleMultiFileSelect, product, getValues } = useProductFormContext();
  const formInstanceKey = product?.id?.trim() || 'product-edit';

  const getEntityJson = useCallback((): Record<string, unknown> => {
    const values = getValues() as unknown as Record<string, unknown>;
    const base = (product ?? {}) as unknown as Record<string, unknown>;
    return { ...base, ...values, ...(product?.id ? { id: product.id } : {}) };
  }, [getValues, product]);

  return (
    <>
      <div className='mb-3'>
        <TriggerButtonBar
          location='product_modal'
          entityType='product'
          entityId={product?.id ?? null}
          getEntityJson={getEntityJson}
        />
      </div>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm
          key={formInstanceKey}
          submitButtonText={submitButtonText}
          {...(validationInstanceScopeOverride ? { validationInstanceScopeOverride } : {})}
        />
      )}
    </>
  );
}

// ─── Skeleton content ─────────────────────────────────────────────────────────

function EditProductSkeletonContent(): React.JSX.Element {
  return (
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
  );
}

// ─── Unified edit modal ───────────────────────────────────────────────────────
// One <FormModal> (one <Dialog>) for the entire edit flow: skeleton → form.
// The Dialog never unmounts between states so only one open animation plays.

function EditProductModal({
  editingProduct,
  isEditHydrating,
  onCloseEdit,
  onEditSuccess,
  onEditSave,
}: {
  editingProduct: ProductWithImages | null;
  isEditHydrating: boolean;
  onCloseEdit: () => void;
  onEditSuccess: () => void;
  onEditSave?: (saved: ProductWithImages) => void;
}): React.JSX.Element | null {
  const [formIsSaving, setFormIsSaving] = useState(false);
  const [formHasUnsavedChanges, setFormHasUnsavedChanges] = useState(false);
  const formSubmitRef = useRef<(() => void) | null>(null);

  const onIsSavingChange = useCallback((v: boolean) => setFormIsSaving(v), []);
  const onHasUnsavedChangesChange = useCallback((v: boolean) => setFormHasUnsavedChanges(v), []);

  const hydratedEditingProduct =
    editingProduct && isEditingProductHydrated(editingProduct) ? editingProduct : null;
  const showSkeleton = isEditHydrating || (Boolean(editingProduct) && !hydratedEditingProduct);
  const isOpen = showSkeleton || Boolean(hydratedEditingProduct);

  const editProviderKey = hydratedEditingProduct
    ? [hydratedEditingProduct.id, 'hydrated', hydratedEditingProduct.updatedAt ?? ''].join(':')
    : null;

  // Reset bridge state when skeleton is showing (form is no longer mounted)
  useEffect(() => {
    if (showSkeleton) {
      setFormIsSaving(false);
      setFormHasUnsavedChanges(false);
    }
  }, [showSkeleton]);

  if (!isOpen) return null;

  return (
    <FormModal
      open
      onClose={onCloseEdit}
      title='Edit Product'
      subtitle={showSkeleton ? 'Loading full product details before editing.' : undefined}
      onSave={() => formSubmitRef.current?.()}
      isSaving={formIsSaving}
      disableCloseWhileSaving
      isSaveDisabled={showSkeleton || formIsSaving}
      hasUnsavedChanges={formHasUnsavedChanges}
      saveText='Update'
      cancelText='Close'
      size='xl'
      className='md:min-w-[63rem] max-w-[66rem]'
    >
      {showSkeleton ? (
        <EditProductSkeletonContent />
      ) : hydratedEditingProduct && editProviderKey ? (
        <ProductFormProvider
          key={editProviderKey}
          product={hydratedEditingProduct}
          onSuccess={onEditSuccess}
          onEditSave={onEditSave}
          requireHydratedEditProduct
        >
          <ProductFormEditBridge
            onIsSavingChange={onIsSavingChange}
            onHasUnsavedChangesChange={onHasUnsavedChangesChange}
            submitRef={formSubmitRef}
          />
          <ProductFormEditBody
            submitButtonText='Update'
            validationInstanceScopeOverride='product_edit'
          />
        </ProductFormProvider>
      ) : null}
    </FormModal>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

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

      <EditProductModal
        editingProduct={editingProduct}
        isEditHydrating={isEditHydrating}
        onCloseEdit={onCloseEdit}
        onEditSuccess={onEditSuccess}
        onEditSave={onEditSave}
      />

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
