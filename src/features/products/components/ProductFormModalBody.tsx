'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef } from 'react';

import { getProductById } from '@/features/products/api/products';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { ProductLeafCategoriesContextRegistrySource } from '@/features/products/context-registry/ProductLeafCategoriesContextRegistrySource';
import { PRODUCT_EDITOR_CONTEXT_ROOT_IDS } from '@/features/products/context-registry/workspace';
import { useProductListHeaderActionsContext } from '@/features/products/context/ProductListContext';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import { isNormalizeProductNamePath } from '@/features/products/lib/extractNormalizeProductNameFromAiPathRunDetail';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { Button } from '@/shared/ui/button';
import { ContextRegistryPageProvider } from '@/shared/lib/ai-context-registry/page-context';
import {
  getProductDetailEditQueryKey,
  getProductDetailQueryKey,
  productsCountsQueryKey,
  productsListsQueryKey,
} from '@/shared/lib/product-query-keys';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';
import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';
import type { TriggerButtonRunSnapshotArgs } from '@/shared/lib/ai-paths/hooks/useTriggerButtons';

import { loadProductForm } from './product-form-preload';
import { EditProductSkeletonContent } from './EditProductSkeletonContent';
import type { NormalizeCompletionState, ProductFormScope } from './ProductModals.types';
import { useProductTranslationTracking } from '../hooks/useProductTranslationTracking';
import { useProductNormalizeEffect } from '../hooks/useProductNormalizeEffect';

const ProductForm = dynamic(loadProductForm, {
  ssr: false,
  loading: () => <EditProductSkeletonContent />,
});

const FileManager = dynamic(() => import('@/features/files/public').then((mod) => mod.default), {
  ssr: false,
});
const PRODUCT_EDITOR_CONTEXT_ROOT_NODE_IDS = [...PRODUCT_EDITOR_CONTEXT_ROOT_IDS];
const PRODUCT_TRIGGER_REFRESH_FIELDS = [
  'description_en',
  'description_pl',
  'description_de',
] as const;
type ProductTriggerRefreshField = (typeof PRODUCT_TRIGGER_REFRESH_FIELDS)[number];
type ProductFormModalBodyProps = {
  submitButtonText: string;
  validationInstanceScopeOverride?: ProductFormScope;
  validatorSessionKey?: string;
  disableTriggerButtons?: boolean;
  pendingNormalizeCompletion: NormalizeCompletionState | null;
  onNormalizeRunQueued: (runId: string) => void;
  onNormalizeCompletionHandled: (runId: string) => void;
};

const shouldApplyRefreshedProductField = (input: {
  currentValue: unknown;
  baselineValue: unknown;
  nextValue: string;
}): boolean => {
  const currentText = typeof input.currentValue === 'string' ? input.currentValue : '';
  const baselineText = typeof input.baselineValue === 'string' ? input.baselineValue : '';
  if (currentText === input.nextValue) return false;
  return currentText.trim().length === 0 || currentText === baselineText;
};

const applyRefreshedProductDescriptions = (input: {
  refreshedProduct: ProductWithImages;
  product: ProductWithImages | undefined;
  getValues: (field: ProductTriggerRefreshField) => ProductFormData[ProductTriggerRefreshField];
  setValue: ReturnType<typeof useProductFormCore>['setValue'];
}): void => {
  PRODUCT_TRIGGER_REFRESH_FIELDS.forEach((field) => {
    const nextValue = input.refreshedProduct[field];
    if (typeof nextValue !== 'string') return;
    if (
      shouldApplyRefreshedProductField({
        currentValue: input.getValues(field),
        baselineValue: input.product?.[field],
        nextValue,
      }) === false
    ) {
      return;
    }
    input.setValue(field, nextValue, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  });
};

const resolveProductIdFromRunSnapshot = (
  args: TriggerButtonRunSnapshotArgs,
  fallbackProductId: string | undefined
): string | null => {
  const candidate = args.snapshot.entityId ?? args.entityId ?? fallbackProductId ?? null;
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
};

const isCompletedProductTriggerSnapshot = (args: TriggerButtonRunSnapshotArgs): boolean =>
  args.entityType === 'product' &&
  args.snapshot.status === 'completed' &&
  args.snapshot.trackingState === 'stopped';

const useProductTriggerSnapshotRefresh = (): ((args: TriggerButtonRunSnapshotArgs) => void) => {
  const { getValues, product, setValue } = useProductFormCore();
  const queryClient = useQueryClient();
  const refreshedRunIdsRef = useRef<Set<string>>(new Set());

  const refreshProductAfterCompletedTrigger = useCallback(
    async (productId: string): Promise<void> => {
      const refreshedProduct = await getProductById(productId, { fresh: true });
      queryClient.setQueryData(getProductDetailQueryKey(productId), refreshedProduct);
      queryClient.setQueryData(getProductDetailEditQueryKey(productId), refreshedProduct);
      applyRefreshedProductDescriptions({ refreshedProduct, product, getValues, setValue });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getProductDetailQueryKey(productId) }),
        queryClient.invalidateQueries({ queryKey: getProductDetailEditQueryKey(productId) }),
        queryClient.invalidateQueries({ queryKey: productsListsQueryKey }),
        queryClient.invalidateQueries({ queryKey: productsCountsQueryKey }),
      ]);
    },
    [getValues, product, queryClient, setValue]
  );

  return useCallback(
    (args: TriggerButtonRunSnapshotArgs): void => {
      if (isCompletedProductTriggerSnapshot(args) === false) return;
      const productId = resolveProductIdFromRunSnapshot(args, product?.id);
      if (productId === null) return;
      if (refreshedRunIdsRef.current.has(args.snapshot.runId)) return;
      refreshedRunIdsRef.current.add(args.snapshot.runId);
      refreshProductAfterCompletedTrigger(productId).catch((error: unknown) => {
        void ErrorSystem.captureException(error);
      });
    },
    [product?.id, refreshProductAfterCompletedTrigger]
  );
};

export function ProductFormModalBridge(props: {
  onIsSavingChange: (value: boolean) => void;
  onHasUnsavedChangesChange: (value: boolean) => void;
  submitRef: React.MutableRefObject<(() => void) | null>;
}): null {
  const { onIsSavingChange, onHasUnsavedChangesChange, submitRef } = props;
  const { handleSubmit, uploading, hasUnsavedChanges, uploadSuccess } = useProductFormCore();
  const prevUploadSuccessRef = useRef(uploadSuccess);

  submitRef.current = () => {
    handleSubmit().catch((error: unknown) => {
      void ErrorSystem.captureException(error);
    });
  };

  useEffect(() => {
    onIsSavingChange(uploading);
  }, [uploading, onIsSavingChange]);

  useEffect(() => {
    onHasUnsavedChangesChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onHasUnsavedChangesChange]);

  useEffect(() => {
    const becameSuccessful = uploadSuccess && !prevUploadSuccessRef.current;
    prevUploadSuccessRef.current = uploadSuccess;
    if (becameSuccessful) {
      onHasUnsavedChangesChange(false);
    }
  }, [uploadSuccess, onHasUnsavedChangesChange]);

  return null;
}

function ProductFormModalActions(props: {
  disableTriggerButtons: boolean;
  onRunSnapshot?: ((args: TriggerButtonRunSnapshotArgs) => void) | undefined;
  onRunQueued: (args: {
    button: AiTriggerButtonRecord;
    runId: string;
    entityId?: string | null | undefined;
    entityType: 'product' | 'note' | 'custom';
  }) => void;
}): React.JSX.Element {
  const { product, draft, getValues } = useProductFormCore();
  const { imageLinks } = useProductFormImages();
  const { categories } = useProductFormMetadata();
  const { showTriggerRunFeedback, setShowTriggerRunFeedback } =
    useProductListHeaderActionsContext();

  const getEntityJson = useCallback((): Record<string, unknown> => {
    return buildTriggeredProductEntityJson({
      product,
      draft,
      values: { ...getValues(), imageLinks },
      categories,
    });
  }, [categories, getValues, product, draft, imageLinks]);

  return (
    <div className='mb-3 flex flex-wrap items-center gap-2'>
      <TriggerButtonBar
        location='product_modal'
        entityType='product'
        entityId={product?.id ?? null}
        getEntityJson={getEntityJson}
        disabled={props.disableTriggerButtons}
        showRunFeedback={showTriggerRunFeedback}
        onRunQueued={props.onRunQueued}
        onRunSnapshot={props.onRunSnapshot}
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
      {props.disableTriggerButtons === true && (
        <span className='text-xs text-muted-foreground'>
          AI actions are unavailable until full product details finish loading.
        </span>
      )}
    </div>
  );
}

function ProductFormModalContent(props: {
  showFileManager: boolean;
  handleMultiFileSelect: (files: ImageFileSelection[]) => void;
  submitButtonText: string;
  validatorSessionKey?: string;
  validationInstanceScopeOverride?: ProductFormScope;
}): React.JSX.Element {
  if (props.showFileManager === true) {
    return <FileManager onSelectFile={props.handleMultiFileSelect} />;
  }

  return (
    <ProductForm
      submitButtonText={props.submitButtonText}
      validatorSessionKey={props.validatorSessionKey}
      {...(props.validationInstanceScopeOverride !== undefined
        ? { validationInstanceScopeOverride: props.validationInstanceScopeOverride }
        : {})}
    />
  );
}

export function ProductFormModalBody(props: ProductFormModalBodyProps): React.JSX.Element {
  const { setNormalizeNameError } = useProductFormCore();
  const { showFileManager, handleMultiFileSelect } = useProductFormImages();
  const handleRunSnapshot = useProductTriggerSnapshotRefresh();
  const shouldApplyNormalizeResultLocally = props.validationInstanceScopeOverride !== undefined;
  const { handleTranslationRunQueued } = useProductTranslationTracking({
    shouldApplyNormalizeResultLocally,
  });
  useProductNormalizeEffect({
    shouldApplyNormalizeResultLocally,
    pendingNormalizeCompletion: props.pendingNormalizeCompletion,
    onNormalizeCompletionHandled: props.onNormalizeCompletionHandled,
  });
  const handleRunQueued = useCallback(
    (args: {
      button: AiTriggerButtonRecord;
      runId: string;
      entityId?: string | null | undefined;
      entityType: 'product' | 'note' | 'custom';
    }): void => {
      if (shouldApplyNormalizeResultLocally === false) return;
      if (isNormalizeProductNamePath(args.button.pathId)) {
        setNormalizeNameError(null);
        props.onNormalizeRunQueued(args.runId);
        return;
      }
      handleTranslationRunQueued(args.button, args.runId);
    },
    [
      handleTranslationRunQueued,
      props.onNormalizeRunQueued,
      setNormalizeNameError,
      shouldApplyNormalizeResultLocally,
    ]
  );

  return (
    <ContextRegistryPageProvider
      pageId='admin:product-editor-modal'
      title='Product Editor Modal'
      rootNodeIds={PRODUCT_EDITOR_CONTEXT_ROOT_NODE_IDS}
    >
      <ProductLeafCategoriesContextRegistrySource sourceId='product-modal-leaf-categories' />
      <ProductFormModalActions
        disableTriggerButtons={props.disableTriggerButtons === true}
        onRunQueued={handleRunQueued}
        onRunSnapshot={handleRunSnapshot}
      />
      <ProductFormModalContent
        showFileManager={showFileManager}
        handleMultiFileSelect={handleMultiFileSelect}
        submitButtonText={props.submitButtonText}
        validatorSessionKey={props.validatorSessionKey}
        validationInstanceScopeOverride={props.validationInstanceScopeOverride}
      />
    </ContextRegistryPageProvider>
  );
}
