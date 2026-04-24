'use client';

import { Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { ProductLeafCategoriesContextRegistrySource } from '@/features/products/context-registry/ProductLeafCategoriesContextRegistrySource';
import { PRODUCT_EDITOR_CONTEXT_ROOT_IDS } from '@/features/products/context-registry/workspace';
import { useProductListHeaderActionsContext } from '@/features/products/context/ProductListContext';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import { isNormalizeProductNamePath } from '@/features/products/lib/extractNormalizeProductNameFromAiPathRunDetail';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { Button } from '@/shared/ui/button';
import { ContextRegistryPageProvider } from '@/shared/lib/ai-context-registry/page-context';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';
import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';

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

export function ProductFormModalBridge(props: {
  onIsSavingChange: (value: boolean) => void;
  onHasUnsavedChangesChange: (value: boolean) => void;
  submitRef: React.MutableRefObject<(() => void) | null>;
}): null {
  const { onIsSavingChange, onHasUnsavedChangesChange, submitRef } = props;
  const { handleSubmit, uploading, hasUnsavedChanges } = useProductFormCore();

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

  return null;
}

function ProductFormModalActions(props: {
  disableTriggerButtons: boolean;
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
  const { showTriggerRunFeedback, setShowTriggerRunFeedback } = useProductListHeaderActionsContext();

  const getEntityJson = useCallback((): Record<string, unknown> => {
    return buildTriggeredProductEntityJson({
      product, draft,
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

export function ProductFormModalBody(props: {
  submitButtonText: string;
  validationInstanceScopeOverride?: ProductFormScope;
  validatorSessionKey?: string;
  disableTriggerButtons?: boolean;
  pendingNormalizeCompletion: NormalizeCompletionState | null;
  onNormalizeRunQueued: (runId: string) => void;
  onNormalizeCompletionHandled: (runId: string) => void;
}): React.JSX.Element {
  const { setNormalizeNameError } = useProductFormCore();
  const { showFileManager, handleMultiFileSelect } = useProductFormImages();
  const shouldApplyNormalizeResultLocally = props.validationInstanceScopeOverride !== undefined;
  const { handleTranslationRunQueued } = useProductTranslationTracking({ shouldApplyNormalizeResultLocally });
  useProductNormalizeEffect({
    shouldApplyNormalizeResultLocally,
    pendingNormalizeCompletion: props.pendingNormalizeCompletion,
    onNormalizeCompletionHandled: props.onNormalizeCompletionHandled,
  });
  const handleRunQueued = useCallback(
    (args: {
      button: AiTriggerButtonRecord; runId: string;
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
    [handleTranslationRunQueued, props.onNormalizeRunQueued, setNormalizeNameError, shouldApplyNormalizeResultLocally]
  );
  return (
    <ContextRegistryPageProvider
      pageId='admin:product-editor-modal'
      title='Product Editor Modal'
      rootNodeIds={[...PRODUCT_EDITOR_CONTEXT_ROOT_IDS]}
    >
      <ProductLeafCategoriesContextRegistrySource sourceId='product-modal-leaf-categories' />
      <ProductFormModalActions disableTriggerButtons={props.disableTriggerButtons === true} onRunQueued={handleRunQueued} />
      {showFileManager === true ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm
          submitButtonText={props.submitButtonText}
          validatorSessionKey={props.validatorSessionKey}
          {...(props.validationInstanceScopeOverride !== undefined ? { validationInstanceScopeOverride: props.validationInstanceScopeOverride } : {})}
        />
      )}
    </ContextRegistryPageProvider>
  );
}
