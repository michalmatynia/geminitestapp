'use client';

// ProductModals: coordinates product create/edit modals and related
// modal lifecycle (hydration, dynamic imports, editor providers). Keeps modal
// orchestration separate from toolbar and table to simplify testing.

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ProductFormProvider } from '@/features/products/context/ProductFormContext';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useProductFormParameters } from '@/features/products/context/ProductFormParameterContext';
import { ProductLeafCategoriesContextRegistrySource } from '@/features/products/context-registry/ProductLeafCategoriesContextRegistrySource';
import { PRODUCT_EDITOR_CONTEXT_ROOT_IDS } from '@/features/products/context-registry/workspace';
import {
  useProductListHeaderActionsContext,
  useProductListSelectionContext,
  useProductListModalsContext,
} from '@/features/products/context/ProductListContext';
import { resolveProductListingsIntegrationScope } from '@/features/integrations/utils/product-listings-recovery';
import { isEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import { extractTranslationEnPlFromAiPathRunDetail } from '@/features/products/lib/extractTranslationEnPlFromAiPathRunDetail';
import {
  extractNormalizeProductNameResultFromAiPathRunDetail,
  isNormalizeProductNamePath,
  type NormalizeProductNameAiPathResult,
} from '@/features/products/lib/extractNormalizeProductNameFromAiPathRunDetail';
import { validateNormalizedProductName } from '@/features/products/lib/validateNormalizedProductName';
import type { ProductTriggerButtonBarProps } from '@/features/products/lib/product-integrations-adapter-loader';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { getAiPathRun, getAiPathRunResult } from '@/shared/lib/ai-paths/api/client';
import { subscribeToTrackedAiPathRun } from '@/shared/lib/ai-paths/client-run-tracker';
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
    import('@/features/integrations/product-integrations-adapter').then(
      (mod: typeof import('@/features/integrations/product-integrations-adapter')) =>
        mod.ListProductModal
    ),
  { ssr: false }
);

const MassListProductModal = dynamic(
  () =>
    import('@/features/integrations/product-integrations-adapter').then(
      (mod: typeof import('@/features/integrations/product-integrations-adapter')) =>
        mod.MassListProductModal
    ),
  { ssr: false }
);

const ProductListingsModal = dynamic(
  () =>
    import('@/features/integrations/product-integrations-adapter').then(
      (mod: typeof import('@/features/integrations/product-integrations-adapter')) =>
        mod.ProductListingsModal
    ),
  { ssr: false }
);

type ProductFormScope = 'draft_template' | 'product_create' | 'product_edit';
const STARTER_TRANSLATION_EN_PL_PATH_ID = 'path_96708d';

const isTranslationEnPlTriggerButton = (button: AiTriggerButtonRecord): boolean => {
  if (button.pathId?.trim() === STARTER_TRANSLATION_EN_PL_PATH_ID) {
    return true;
  }

  const labels = [button.name, button.display?.label]
    .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
    .filter(Boolean);
  return labels.some(
    (label) => label.includes('translate en->pl') || label.includes('translation en->pl')
  );
};

type NormalizeCompletionState =
  | {
      kind: 'result';
      runId: string;
      result: NormalizeProductNameAiPathResult;
    }
  | {
      kind: 'error';
      runId: string;
      error: string;
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
  validatorSessionKey?: string;
  disableTriggerButtons?: boolean;
  pendingNormalizeCompletion: NormalizeCompletionState | null;
  onNormalizeRunQueued: (runId: string) => void;
  onNormalizeCompletionHandled: (runId: string) => void;
}): React.JSX.Element {
  const {
    submitButtonText,
    validationInstanceScopeOverride,
    validatorSessionKey,
    disableTriggerButtons = false,
    pendingNormalizeCompletion,
    onNormalizeRunQueued,
    onNormalizeCompletionHandled,
  } = props;

  const { product, draft, getValues, setValue, setNormalizeNameError } = useProductFormCore();
  const { applyLocalizedParameterValues } = useProductFormParameters();
  const { showFileManager, handleMultiFileSelect, imageLinks } = useProductFormImages();
  const { categories } = useProductFormMetadata();
  const { showTriggerRunFeedback, setShowTriggerRunFeedback } = useProductListHeaderActionsContext();
  const shouldApplyNormalizeResultLocally = validationInstanceScopeOverride !== undefined;
  const [pendingTranslationRunId, setPendingTranslationRunId] = useState<string | null>(null);

  const getEntityJson = useCallback((): Record<string, unknown> => {
    return buildTriggeredProductEntityJson({
      product,
      draft,
      values: {
        ...getValues(),
        imageLinks,
      },
      categories,
    });
  }, [categories, getValues, product, draft, imageLinks]);

  const handleRunQueued = useCallback(
    (args: {
      button: AiTriggerButtonRecord;
      runId: string;
      entityId?: string | null | undefined;
      entityType: 'product' | 'note' | 'custom';
    }): void => {
      if (!shouldApplyNormalizeResultLocally) return;
      if (isNormalizeProductNamePath(args.button.pathId)) {
        setNormalizeNameError(null);
        onNormalizeRunQueued(args.runId);
        return;
      }
      if (isTranslationEnPlTriggerButton(args.button)) {
        setPendingTranslationRunId(args.runId);
      }
    },
    [onNormalizeRunQueued, setNormalizeNameError, shouldApplyNormalizeResultLocally]
  );

  useEffect(() => {
    if (!pendingTranslationRunId) return;

    let active = true;
    let terminalHandled = false;
    const trackedRunId = pendingTranslationRunId;

    const unsubscribe = subscribeToTrackedAiPathRun(trackedRunId, (snapshot) => {
      if (!active || terminalHandled || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;

      void (async (): Promise<void> => {
        if (snapshot.status !== 'completed') {
          if (!active) return;
          setPendingTranslationRunId((current) => (current === trackedRunId ? null : current));
          return;
        }

        const streamedTranslation = snapshot.run
          ? extractTranslationEnPlFromAiPathRunDetail({ run: snapshot.run })
          : null;
        let translationResult = streamedTranslation;

        if (!translationResult) {
          const response = await getAiPathRun(trackedRunId, { timeoutMs: 60_000 });
          if (!active) return;
          if (!response.ok) {
            setPendingTranslationRunId((current) => (current === trackedRunId ? null : current));
            return;
          }
          translationResult = extractTranslationEnPlFromAiPathRunDetail(response.data);
        }

        if (!active) return;

        if (translationResult?.descriptionPl) {
          setValue('description_pl', translationResult.descriptionPl, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }

        if (translationResult && translationResult.parameterTranslations.length > 0) {
          applyLocalizedParameterValues(
            translationResult.parameterTranslations.map((entry) => ({
              parameterId: entry.parameterId,
              languageCode: 'pl',
              value: entry.value,
            }))
          );
        }

        setPendingTranslationRunId((current) => (current === trackedRunId ? null : current));
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyLocalizedParameterValues, pendingTranslationRunId, setValue]);

  useEffect(() => {
    if (!pendingNormalizeCompletion || !shouldApplyNormalizeResultLocally) return;

    const completionRunId = pendingNormalizeCompletion.runId;

    try {
      if (pendingNormalizeCompletion.kind === 'error') {
        setNormalizeNameError(pendingNormalizeCompletion.error);
        return;
      }

      const normalizeResult = pendingNormalizeCompletion.result;
      if (normalizeResult.isValid === false) {
        setNormalizeNameError(
          normalizeResult.validationError ??
            'Normalize failed: the AI Path returned an invalid normalized title.'
        );
        return;
      }
      if (!normalizeResult.normalizedName) {
        setNormalizeNameError(
          normalizeResult.validationError ??
            'Normalize failed: the AI Path did not return a normalized English title.'
        );
        return;
      }

      const validation = validateNormalizedProductName({
        normalizedName: normalizeResult.normalizedName,
        categories,
        categoryHint: normalizeResult.category,
        categoryContext: normalizeResult.categoryContext,
      });
      if (!validation.isValid) {
        setNormalizeNameError(validation.error);
        return;
      }

      setNormalizeNameError(null);
      setValue('name_en', validation.normalizedName, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    } finally {
      onNormalizeCompletionHandled(completionRunId);
    }
  }, [
    categories,
    onNormalizeCompletionHandled,
    pendingNormalizeCompletion,
    setNormalizeNameError,
    setValue,
    shouldApplyNormalizeResultLocally,
  ]);

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
          disabled={disableTriggerButtons}
          showRunFeedback={showTriggerRunFeedback}
          onRunQueued={handleRunQueued}
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
        {disableTriggerButtons ? (
          <span className='text-xs text-muted-foreground'>
            AI actions are unavailable until full product details finish loading.
          </span>
        ) : null}
      </div>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm
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
  const [pendingNormalizeRunId, setPendingNormalizeRunId] = useState<string | null>(null);
  const [pendingNormalizeCompletion, setPendingNormalizeCompletion] =
    useState<NormalizeCompletionState | null>(null);
  const shouldSuppressNonHydratedEditWarning =
    suppressNonHydratedEditWarning || isSaveDisabledOverride;
  const shouldApplyNormalizeResultLocally = validationInstanceScopeOverride !== undefined;

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

  useEffect(() => {
    if (!pendingNormalizeRunId || !shouldApplyNormalizeResultLocally) return;

    let active = true;
    let terminalHandled = false;
    const trackedRunId = pendingNormalizeRunId;

    const unsubscribe = subscribeToTrackedAiPathRun(trackedRunId, (snapshot) => {
      if (!active || terminalHandled || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;

      void (async (): Promise<void> => {
        if (snapshot.status !== 'completed') {
          if (!active) return;
          setPendingNormalizeCompletion({
            kind: 'error',
            runId: trackedRunId,
            error:
              snapshot.errorMessage ??
              `Normalize failed: the AI Path run ${snapshot.status.replace(/_/g, ' ')}.`,
          });
          setPendingNormalizeRunId((current) => (current === trackedRunId ? null : current));
          return;
        }

        const streamedNormalizeResult = snapshot.run
          ? extractNormalizeProductNameResultFromAiPathRunDetail({ run: snapshot.run })
          : null;
        if (streamedNormalizeResult) {
          setPendingNormalizeCompletion({
            kind: 'result',
            runId: trackedRunId,
            result: streamedNormalizeResult,
          });
          setPendingNormalizeRunId((current) => (current === trackedRunId ? null : current));
          return;
        }

        const response = await getAiPathRunResult(trackedRunId, { timeoutMs: 60_000 });
        if (!active) return;
        if (!response.ok) {
          setPendingNormalizeCompletion({
            kind: 'error',
            runId: trackedRunId,
            error:
              response.error ||
              'Normalize failed: unable to load the completed AI Path run result.',
          });
          setPendingNormalizeRunId((current) => (current === trackedRunId ? null : current));
          return;
        }

        const normalizeResult = extractNormalizeProductNameResultFromAiPathRunDetail(response.data);
        setPendingNormalizeCompletion(
          normalizeResult
            ? {
                kind: 'result',
                runId: trackedRunId,
                result: normalizeResult,
              }
            : {
                kind: 'error',
                runId: trackedRunId,
                error: 'Normalize failed: the AI Path did not return a normalized English title.',
              }
        );
        setPendingNormalizeRunId((current) => (current === trackedRunId ? null : current));
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [pendingNormalizeRunId, shouldApplyNormalizeResultLocally]);

  useEffect(() => {
    if (!isOpen) {
      setPendingNormalizeRunId(null);
      setPendingNormalizeCompletion(null);
    }
  }, [isOpen]);

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
            disableTriggerButtons={
              Boolean(isSaveDisabledOverride) &&
              validationInstanceScopeOverride === 'product_edit'
            }
            pendingNormalizeCompletion={pendingNormalizeCompletion}
            onNormalizeRunQueued={(runId: string) => {
              setPendingNormalizeCompletion(null);
              setPendingNormalizeRunId(runId);
            }}
            onNormalizeCompletionHandled={(runId: string) => {
              setPendingNormalizeCompletion((current) =>
                current?.runId === runId ? null : current
              );
            }}
          />
        </ProductFormProvider>
      )}
    </FormModal>
  );
}

export function ProductModals(): React.JSX.Element {
  const { data } = useProductListSelectionContext();
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
  const selectedMassListProducts = React.useMemo(() => {
    if (!massListProductIds || massListProductIds.length === 0) return [];
    const productById = new Map(data.map((product) => [product.id, product]));
    return massListProductIds
      .map((productId) => productById.get(productId))
      .filter((product): product is ProductWithImages => Boolean(product));
  }, [data, massListProductIds]);

  const hydratedEditingProduct =
    editingProduct && isEditingProductHydrated(editingProduct) ? editingProduct : null;
  // Show the form immediately with list-level data while hydrating, instead of a skeleton.
  // The save button stays disabled until hydration completes (showSkeleton controls that).
  const showEditSkeleton = false;
  const isEditOpen = Boolean(editingProduct);

  const createProviderKey = createDraft ? ['create', createDraft.id].join(':') : 'create';
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
          isOpen={Boolean(integrationsProduct)}
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
          isOpen={Boolean(integrationsProduct)}
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
          isOpen={Boolean(exportSettingsProduct)}
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
          products={selectedMassListProducts}
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
