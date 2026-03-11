'use client';

import { Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';

import { ProductFormProvider } from '@/features/products/context/ProductFormContext';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import {
  useProductListHeaderActionsContext,
  useProductListModalsContext,
} from '@/features/products/context/ProductListContext';
import { isEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductDraft, ProductWithImages } from '@/shared/contracts/products';
import { Button, FormModal, Skeleton } from '@/shared/ui';
const ProductForm = dynamic(() => import('./ProductForm'), {
  ssr: false,
  loading: () => <EditProductSkeletonContent />,
});

const FileManager = dynamic(() => import('@/shared/ui/files'), {
  ssr: false,
});

const SelectIntegrationModal = dynamic(
  () => import('@/features/integrations'),
  {
    ssr: false,
  }
);

type TriggerButtonBarProps = ComponentProps<
  typeof import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').TriggerButtonBar
>;

const TriggerButtonBar = dynamic<TriggerButtonBarProps>(
  () =>
    import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').then(
      (
        mod: typeof import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar')
      ) => mod.TriggerButtonBar
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

const ListProductModal = dynamic(
  () =>
    import('@/shared/lib/product-integrations-adapter').then(
      (mod: typeof import('@/shared/lib/product-integrations-adapter')) => mod.ListProductModal
    ),
  { ssr: false }
);

const MassListProductModal = dynamic(
  () =>
    import('@/shared/lib/product-integrations-adapter').then(
      (mod: typeof import('@/shared/lib/product-integrations-adapter')) => mod.MassListProductModal
    ),
  { ssr: false }
);

const ProductListingsModal = dynamic(
  () =>
    import('@/shared/lib/product-integrations-adapter').then(
      (mod: typeof import('@/shared/lib/product-integrations-adapter')) =>
        mod.ProductListingsModal
    ),
  { ssr: false }
);

type ProductFormScope = 'draft_template' | 'product_create' | 'product_edit';

const normalizeTriggerCatalogIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry: unknown) => {
    const normalized =
      typeof entry === 'string'
        ? entry.trim()
        : entry && typeof entry === 'object'
          ? (typeof (entry as { catalogId?: unknown }).catalogId === 'string'
              ? (entry as { catalogId: string }).catalogId.trim()
              : typeof (entry as { id?: unknown }).id === 'string'
                ? (entry as { id: string }).id.trim()
                : '')
          : '';
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique);
};

export const buildTriggeredProductEntityJson = (args: {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  values: Record<string, unknown>;
}): Record<string, unknown> => {
  const base = args.product ?? args.draft ?? {};
  const entityJson: Record<string, unknown> = {
    ...base,
    ...args.values,
    ...(args.product?.id ? { id: args.product.id } : {}),
  };
  const catalogIds = normalizeTriggerCatalogIds(entityJson['catalogIds']);
  if (catalogIds.length === 0) {
    return entityJson;
  }

  const existingCatalogs: unknown[] = Array.isArray(entityJson['catalogs'])
    ? (entityJson['catalogs'] as unknown[])
    : [];
  entityJson['catalogId'] = catalogIds[0] ?? entityJson['catalogId'];
  entityJson['catalogs'] = catalogIds.map((catalogId: string) => {
    const existing =
      existingCatalogs.find(
        (entry: unknown) =>
          entry &&
          typeof entry === 'object' &&
          typeof (entry as { catalogId?: unknown }).catalogId === 'string' &&
          (entry as { catalogId: string }).catalogId.trim() === catalogId
      ) ?? null;
    if (existing && typeof existing === 'object') {
      return {
        ...(existing as Record<string, unknown>),
        catalogId,
      };
    }
    return {
      catalogId,
      ...(args.product?.id ? { productId: args.product.id } : {}),
    };
  });
  return entityJson;
};

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
  const { showTriggerRunFeedback, setShowTriggerRunFeedback } = useProductListHeaderActionsContext();
  const formInstanceKey = product?.id?.trim() || draft?.id?.trim() || 'product-form';

  const getEntityJson = useCallback((): Record<string, unknown> => {
    return buildTriggeredProductEntityJson({
      product,
      draft,
      values: getValues(),
    });
  }, [getValues, product, draft]);

  return (
    <>
      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <TriggerButtonBar
          location='product_modal'
          entityType='product'
          entityId={product?.id ?? null}
          getEntityJson={getEntityJson}
          showRunFeedback={showTriggerRunFeedback}
        />
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => setShowTriggerRunFeedback(!showTriggerRunFeedback)}
          aria-label={showTriggerRunFeedback ? 'Hide trigger run pills' : 'Show trigger run pills'}
          title={showTriggerRunFeedback ? 'Hide trigger run pills' : 'Show trigger run pills'}
          className='h-8 shrink-0 gap-1.5 px-2 text-xs'
        >
          {showTriggerRunFeedback ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
          <span>{showTriggerRunFeedback ? 'Hide Statuses' : 'Show Statuses'}</span>
        </Button>
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
    ? ['edit', hydratedEditingProduct.id].join(':')
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
