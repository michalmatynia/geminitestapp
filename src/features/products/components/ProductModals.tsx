'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ProductFormProvider } from '@/features/products/context/ProductFormContext';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import { ProductLeafCategoriesContextRegistrySource } from '@/features/products/context-registry/ProductLeafCategoriesContextRegistrySource';
import { PRODUCT_EDITOR_CONTEXT_ROOT_IDS } from '@/features/products/context-registry/workspace';
import {
  useProductListHeaderActionsContext,
  useProductListModalsContext,
} from '@/features/products/context/ProductListContext';
import { resolveProductListingsIntegrationScope } from '@/features/integrations/public';
import { isEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import type { ProductTriggerButtonBarProps } from '@/features/products/lib/product-integrations-adapter-loader';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import {
  useDefaultExportConnection,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import { Button } from '@/shared/ui/button';
import { FormModal } from '@/shared/ui/FormModal';
import { IntegrationSelector } from '@/shared/ui/integration-selector';
import { Skeleton } from '@/shared/ui/skeleton';
import { ContextRegistryPageProvider } from '@/shared/lib/ai-context-registry/page-context';

import { loadProductForm } from './product-form-preload';

export { buildTriggeredProductEntityJson };
const ProductForm = dynamic(loadProductForm, {
  ssr: false,
  loading: () => <EditProductSkeletonContent />,
});

const FileManager = dynamic(() => import('@/features/files/public').then((mod) => mod.default || mod.FileManager), {
  ssr: false,
});

const TriggerButtonBar = dynamic<ProductTriggerButtonBarProps>(
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
    import('@/features/integrations/public').then(
      (mod: typeof import('@/features/integrations/public')) =>
        mod.ListProductModal
    ),
  { ssr: false }
);

const MassListProductModal = dynamic(
  () =>
    import('@/features/integrations/public').then(
      (mod: typeof import('@/features/integrations/public')) =>
        mod.MassListProductModal
    ),
  { ssr: false }
);

const ProductListingsModal = dynamic(
  () =>
    import('@/features/integrations/public').then(
      (mod: typeof import('@/features/integrations/public')) =>
        mod.ProductListingsModal
    ),
  { ssr: false }
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
  validatorSessionKey?: string;
}): React.JSX.Element {
  const { submitButtonText, validationInstanceScopeOverride, validatorSessionKey } = props;

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
    <ContextRegistryPageProvider
      pageId='admin:product-editor-modal'
      title='Product Editor Modal'
      rootNodeIds={[...PRODUCT_EDITOR_CONTEXT_ROOT_IDS]}
    >
      <ProductLeafCategoriesContextRegistrySource sourceId='product-modal-leaf-categories' />
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
          validatorSessionKey={validatorSessionKey}
          {...(validationInstanceScopeOverride ? { validationInstanceScopeOverride } : {})}
        />
      )}
    </ContextRegistryPageProvider>
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

function ProductIntegrationSelectionModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (integrationId: string, connectionId: string) => void;
}): React.JSX.Element | null {
  const { isOpen, onClose, onSelect } = props;
  const { data: integrationsData = [], isLoading } = useIntegrationsWithConnections();
  const { data: preferredConnection } = useDefaultExportConnection();
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');

  const integrations = React.useMemo(
    (): IntegrationWithConnections[] =>
      integrationsData.filter(
        (integration: IntegrationWithConnections) => integration.connections.length > 0
      ),
    [integrationsData]
  );

  useEffect(() => {
    if (!isOpen) return;

    if (integrations.length === 0) {
      if (selectedIntegrationId !== '') setSelectedIntegrationId('');
      if (selectedConnectionId !== '') setSelectedConnectionId('');
      return;
    }

    const hasSelectedIntegration = integrations.some(
      (integration: IntegrationWithConnections) => integration.id === selectedIntegrationId
    );

    if (!hasSelectedIntegration) {
      setSelectedIntegrationId(integrations[0]?.id ?? '');
    }
  }, [integrations, isOpen, selectedConnectionId, selectedIntegrationId]);

  useEffect(() => {
    if (!isOpen || !selectedIntegrationId) return;

    const integration = integrations.find(
      (entry: IntegrationWithConnections) => entry.id === selectedIntegrationId
    );
    const connectionIds = integration?.connections.map((connection) => connection.id) ?? [];

    if (connectionIds.length === 0) {
      if (selectedConnectionId !== '') setSelectedConnectionId('');
      return;
    }

    if (selectedConnectionId && connectionIds.includes(selectedConnectionId)) {
      return;
    }

    const preferredConnectionId = preferredConnection?.connectionId ?? null;
    if (preferredConnectionId && connectionIds.includes(preferredConnectionId)) {
      setSelectedConnectionId(preferredConnectionId);
      return;
    }

    setSelectedConnectionId(connectionIds[0] ?? '');
  }, [integrations, isOpen, preferredConnection?.connectionId, selectedConnectionId, selectedIntegrationId]);

  const handleContinue = useCallback((): void => {
    if (selectedIntegrationId && selectedConnectionId) {
      onSelect(selectedIntegrationId, selectedConnectionId);
    }
  }, [onSelect, selectedConnectionId, selectedIntegrationId]);

  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Select Marketplace / Integration'
      size='md'
      onSave={handleContinue}
      saveText='Continue'
      isSaveDisabled={!selectedIntegrationId || !selectedConnectionId}
    >
      <div className='space-y-4'>
        {isLoading ? (
          <p className='text-sm text-muted-foreground'>Loading integrations...</p>
        ) : integrations.length === 0 ? (
          <div className='rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-6 text-center'>
            <p className='text-sm text-yellow-200'>No connected integrations</p>
            <p className='mt-2 text-xs text-yellow-300/70'>
              <Link href='/admin/integrations' className='underline hover:text-yellow-100'>
                Set up an integration first
              </Link>
            </p>
          </div>
        ) : (
          <IntegrationSelector
            integrations={integrations}
            selectedIntegrationId={selectedIntegrationId}
            onIntegrationChange={setSelectedIntegrationId}
            selectedConnectionId={selectedConnectionId}
            onConnectionChange={setSelectedConnectionId}
          />
        )}
      </div>
    </FormModal>
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
  suppressNonHydratedEditWarning?: boolean;
  showSkeleton?: boolean;
  /** Override to disable save button (e.g. while hydrating fresh data). */
  isSaveDisabledOverride?: boolean;
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
    suppressNonHydratedEditWarning = false,
    showSkeleton = false,
    isSaveDisabledOverride = false,
    validationInstanceScopeOverride,
  } = props;

  const [formIsSaving, setFormIsSaving] = useState(false);
  const [formHasUnsavedChanges, setFormHasUnsavedChanges] = useState(false);
  const formSubmitRef = useRef<(() => void) | null>(null);
  const openSessionCounterRef = useRef(isOpen ? 1 : 0);
  const wasOpenRef = useRef(isOpen);
  const [validatorSessionKey, setValidatorSessionKey] = useState<string>(() =>
    `${providerKey}:session:${isOpen ? 1 : 0}`
  );
  const shouldSuppressNonHydratedEditWarning =
    suppressNonHydratedEditWarning || isSaveDisabledOverride;

  const onIsSavingChange = useCallback((value: boolean) => setFormIsSaving(value), []);
  const onHasUnsavedChangesChange = useCallback(
    (value: boolean) => setFormHasUnsavedChanges(value),
    []
  );

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      openSessionCounterRef.current += 1;
      setValidatorSessionKey(`${providerKey}:session:${openSessionCounterRef.current}`);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, providerKey]);

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
      isSaveDisabled={showSkeleton || formIsSaving || isSaveDisabledOverride}
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
          suppressNonHydratedEditWarning={shouldSuppressNonHydratedEditWarning}
          validatorSessionKey={validatorSessionKey}
        >
          <ProductFormModalBridge
            onIsSavingChange={onIsSavingChange}
            onHasUnsavedChangesChange={onHasUnsavedChangesChange}
            submitRef={formSubmitRef}
          />
          <ProductFormModalBody
            submitButtonText={submitButtonText}
            validationInstanceScopeOverride={validationInstanceScopeOverride}
            validatorSessionKey={validatorSessionKey}
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
    integrationsRecoveryContext,
    integrationsFilterIntegrationSlug,
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
  // Show the form immediately with list-level data while hydrating, instead of a skeleton.
  // The save button stays disabled until hydration completes (showSkeleton controls that).
  const showEditSkeleton = false;
  const isEditOpen = Boolean(editingProduct);

  const createProviderKey = createDraft
    ? ['create', createDraft.id, createDraft.updatedAt ?? ''].join(':')
    : 'create';
  // Include hydration state in the key so the form remounts with full data
  // (list-level data may lack descriptions, etc.)
  const editProviderKey = editingProduct
    ? ['edit', editingProduct.id, hydratedEditingProduct ? 'h' : 'p'].join(':')
    : 'edit';
  const effectiveIntegrationsFilterIntegrationSlug = resolveProductListingsIntegrationScope({
    filterIntegrationSlug: integrationsFilterIntegrationSlug,
    recoveryContext: integrationsRecoveryContext,
  });

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
        subtitle={isEditHydrating ? 'Loading full product details…' : undefined}
        saveText='Update'
        submitButtonText='Update'
        providerKey={editProviderKey}
        product={hydratedEditingProduct ?? editingProduct ?? undefined}
        onSuccess={onEditSuccess}
        onEditSave={onEditSave}
        requireHydratedEditProduct
        validationInstanceScopeOverride='product_edit'
        showSkeleton={showEditSkeleton}
        isSaveDisabledOverride={isEditHydrating}
      />

      {integrationsProduct && !showListProductModal && (
        <ProductListingsModal
          isOpen={!!integrationsProduct}
          item={integrationsProduct}
          onClose={onCloseIntegrations}
          onStartListing={onStartListing}
          onListingsUpdated={onListingsUpdated}
          filterIntegrationSlug={effectiveIntegrationsFilterIntegrationSlug}
          recoveryContext={integrationsRecoveryContext}
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
          autoSubmitOnOpen={Boolean(listProductPreset?.autoSubmit)}
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
        <ProductIntegrationSelectionModal
          isOpen={showIntegrationModal}
          onClose={onCloseIntegrationModal}
          onSelect={onSelectIntegrationFromModal}
        />
      )}
    </>
  );
}
