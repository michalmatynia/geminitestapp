'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ProductFormProvider } from '@/features/products/context/ProductFormContext';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import { useProductListModalsContext } from '@/features/products/context/ProductListContext';
import { isEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';
import {
  ListProductModal,
  MassListProductModal,
  ProductListingsModal,
} from '@/shared/lib/product-integrations-adapter';
import type { ProductDraft, ProductWithImages } from '@/shared/contracts/products';
import { FormModal, Skeleton } from '@/shared/ui';

import ProductForm from './ProductForm';

const FileManager = dynamic(() => import('@/features/files'), {
  ssr: false,
});

const SelectIntegrationModal = dynamic(
  () => import('@/shared/lib/product-integrations-adapter'),
  {
    ssr: false,
  }
);

type ProductFormScope = 'draft_template' | 'product_create' | 'product_edit';

function ProductFormModalBridge(props: {
  onIsSavingChange: (value: boolean) => void;
  onHasUnsavedChangesChange: (value: boolean) => void;
  submitRef: React.MutableRefObject<(() => void) | null>;
}): null {
  const { onIsSavingChange, onHasUnsavedChangesChange, submitRef } = props;
  const { handleSubmit, uploading, hasUnsavedChanges } = useProductFormCore();

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

function ProductFormModalBody(props: {
  submitButtonText: string;
  validationInstanceScopeOverride?: ProductFormScope;
}): React.JSX.Element {
  const { submitButtonText, validationInstanceScopeOverride } = props;

  const { product, draft, getValues } = useProductFormCore();
  const { showFileManager, handleMultiFileSelect } = useProductFormImages();
  const formInstanceKey = product?.id?.trim() || draft?.id?.trim() || 'product-form';

  const getEntityJson = useCallback((): Record<string, unknown> => {
    const values = getValues() as unknown as Record<string, unknown>;
    const base = (product ?? draft ?? {}) as unknown as Record<string, unknown>;
    return { ...base, ...values, ...(product?.id ? { id: product.id } : {}) };
  }, [getValues, product, draft]);

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

type ProductEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  saveText: string;
  submitButtonText: string;
  providerKey: string;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  onSuccess: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  initialSku?: string;
  initialCatalogId?: string;
  requireHydratedEditProduct?: boolean;
  showSkeleton?: boolean;
  validationInstanceScopeOverride?: ProductFormScope;
};

function ProductEditorModal(props: ProductEditorModalProps): React.JSX.Element | null {
  const {
    isOpen,
    onClose,
    title,
    subtitle,
    saveText,
    submitButtonText,
    providerKey,
    product,
    draft,
    onSuccess,
    onEditSave,
    initialSku,
    initialCatalogId,
    requireHydratedEditProduct = false,
    showSkeleton = false,
    validationInstanceScopeOverride,
  } = props;

  const [formIsSaving, setFormIsSaving] = useState(false);
  const [formHasUnsavedChanges, setFormHasUnsavedChanges] = useState(false);
  const formSubmitRef = useRef<(() => void) | null>(null);

  const onIsSavingChange = useCallback((value: boolean) => setFormIsSaving(value), []);
  const onHasUnsavedChangesChange = useCallback(
    (value: boolean) => setFormHasUnsavedChanges(value),
    []
  );

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
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      onSave={() => formSubmitRef.current?.()}
      isSaving={formIsSaving}
      disableCloseWhileSaving
      isSaveDisabled={showSkeleton || formIsSaving}
      hasUnsavedChanges={formHasUnsavedChanges}
      saveText={saveText}
      cancelText='Close'
      size='xl'
      className='md:min-w-[63rem] max-w-[66rem]'
    >
      {showSkeleton ? (
        <EditProductSkeletonContent />
      ) : (
        <ProductFormProvider
          key={providerKey}
          product={product}
          draft={draft ?? undefined}
          onSuccess={onSuccess}
          onEditSave={onEditSave}
          initialSku={initialSku}
          initialCatalogId={initialCatalogId}
          requireHydratedEditProduct={requireHydratedEditProduct}
        >
          <ProductFormModalBridge
            onIsSavingChange={onIsSavingChange}
            onHasUnsavedChangesChange={onHasUnsavedChangesChange}
            submitRef={formSubmitRef}
          />
          <ProductFormModalBody
            submitButtonText={submitButtonText}
            validationInstanceScopeOverride={validationInstanceScopeOverride}
          />
        </ProductFormProvider>
      )}
    </FormModal>
  );
}

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
  const showEditSkeleton = isEditHydrating || (Boolean(editingProduct) && !hydratedEditingProduct);
  const isEditOpen = showEditSkeleton || Boolean(hydratedEditingProduct);

  const createProviderKey = createDraft
    ? ['create', createDraft.id, createDraft.updatedAt ?? ''].join(':')
    : 'create';
  const editProviderKey = hydratedEditingProduct
    ? [hydratedEditingProduct.id, 'hydrated', hydratedEditingProduct.updatedAt ?? ''].join(':')
    : 'edit';

  return (
    <>
      <ProductEditorModal
        isOpen={isCreateOpen}
        onClose={onCloseCreate}
        title='Create Product'
        subtitle={createDraft ? `Using draft template: ${createDraft.name}` : undefined}
        saveText='Create'
        submitButtonText='Create'
        providerKey={createProviderKey}
        draft={createDraft}
        onSuccess={onCreateSuccess}
        initialSku={initialSku}
        initialCatalogId={initialCatalogId ?? undefined}
        validationInstanceScopeOverride={createDraft?.id ? 'draft_template' : 'product_create'}
      />

      <ProductEditorModal
        isOpen={isEditOpen}
        onClose={onCloseEdit}
        title='Edit Product'
        subtitle={showEditSkeleton ? 'Loading full product details before editing.' : undefined}
        saveText='Update'
        submitButtonText='Update'
        providerKey={editProviderKey}
        product={hydratedEditingProduct ?? undefined}
        onSuccess={onEditSuccess}
        onEditSave={onEditSave}
        requireHydratedEditProduct
        validationInstanceScopeOverride='product_edit'
        showSkeleton={showEditSkeleton}
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
