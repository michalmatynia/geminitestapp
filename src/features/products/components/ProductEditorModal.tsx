'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ProductFormProvider } from '@/features/products/context/ProductFormContext';
import { useProductNormalizeTracking } from '@/features/products/hooks/useProductNormalizeTracking';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { FormModal } from '@/shared/ui/FormModal';

import { EditProductSkeletonContent } from './EditProductSkeletonContent';
import {
  ProductFormModalBody,
  ProductFormModalBridge,
} from './ProductFormModalBody';
import type { ProductFormScope, NormalizeCompletionState } from './ProductModals.types';

export type ProductEditorModalProps = {
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

type EditorModalState = {
  formIsSaving: boolean;
  setFormIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  formHasUnsavedChanges: boolean;
  setFormHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  formSubmitRef: React.MutableRefObject<(() => void) | null>;
  validatorSessionKey: string;
  pendingNormalizeCompletion: NormalizeCompletionState | null;
  setPendingNormalizeCompletion: React.Dispatch<React.SetStateAction<NormalizeCompletionState | null>>;
  setPendingNormalizeRunId: React.Dispatch<React.SetStateAction<string | null>>;
};

function useProductEditorModalState(args: {
  isOpen: boolean;
  providerKey: string;
  shouldApplyNormalizeResultLocally: boolean;
}): EditorModalState {
  const { isOpen, providerKey, shouldApplyNormalizeResultLocally } = args;
  const [formIsSaving, setFormIsSaving] = useState(false);
  const [formHasUnsavedChanges, setFormHasUnsavedChanges] = useState(false);
  const formSubmitRef = useRef<(() => void) | null>(null);
  const openSessionCounterRef = useRef(isOpen ? 1 : 0);
  const wasOpenRef = useRef(isOpen);
  const [validatorSessionKey, setValidatorSessionKey] = useState<string>(() =>
    `${providerKey}:session:${isOpen ? 1 : 0}`
  );

  const {
    setPendingNormalizeRunId,
    pendingNormalizeCompletion,
    setPendingNormalizeCompletion,
  } = useProductNormalizeTracking({ isOpen, shouldApplyNormalizeResultLocally });

  useEffect(() => {
    if (isOpen === true && wasOpenRef.current === false) {
      openSessionCounterRef.current += 1;
      setValidatorSessionKey(`${providerKey}:session:${openSessionCounterRef.current}`);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, providerKey]);

  return {
    formIsSaving, setFormIsSaving,
    formHasUnsavedChanges, setFormHasUnsavedChanges,
    formSubmitRef,
    validatorSessionKey,
    pendingNormalizeCompletion,
    setPendingNormalizeCompletion,
    setPendingNormalizeRunId,
  };
}

function ProductEditorModalInner(props: ProductEditorModalProps & { state: EditorModalState }): React.JSX.Element {
  const {
    providerKey, product, draft, onSuccess, onEditSave,
    initialSku, initialCatalogId, requireHydratedEditProduct,
    suppressNonHydratedEditWarning, isSaveDisabledOverride,
    validationInstanceScopeOverride, submitButtonText, state
  } = props;

  const onIsSavingChange = useCallback((value: boolean) => state.setFormIsSaving(value), [state]);
  const onHasUnsavedChangesChange = useCallback((value: boolean) => state.setFormHasUnsavedChanges(value), [state]);

  return (
    <ProductFormProvider
      key={providerKey}
      product={product}
      draft={draft ?? undefined}
      onSuccess={onSuccess}
      onEditSave={onEditSave}
      initialSku={initialSku}
      initialCatalogId={initialCatalogId}
      requireHydratedEditProduct={requireHydratedEditProduct}
      suppressNonHydratedEditWarning={(suppressNonHydratedEditWarning === true) || (isSaveDisabledOverride === true)}
      validatorSessionKey={state.validatorSessionKey}
    >
      <ProductFormModalBridge
        onIsSavingChange={onIsSavingChange}
        onHasUnsavedChangesChange={onHasUnsavedChangesChange}
        submitRef={state.formSubmitRef}
      />
      <ProductFormModalBody
        submitButtonText={submitButtonText}
        validationInstanceScopeOverride={validationInstanceScopeOverride}
        validatorSessionKey={state.validatorSessionKey}
        disableTriggerButtons={(isSaveDisabledOverride === true) && validationInstanceScopeOverride === 'product_edit'}
        pendingNormalizeCompletion={state.pendingNormalizeCompletion}
        onNormalizeRunQueued={(runId: string) => {
          state.setPendingNormalizeCompletion(null);
          state.setPendingNormalizeRunId(runId);
        }}
        onNormalizeCompletionHandled={(runId: string) => {
          state.setPendingNormalizeCompletion((current) => current?.runId === runId ? null : current);
        }}
      />
    </ProductFormProvider>
  );
}

export function ProductEditorModal(props: ProductEditorModalProps): React.JSX.Element | null {
  const {
    isOpen, onClose, title, subtitle, saveText, showSkeleton = false,
    isSaveDisabledOverride = false, validationInstanceScopeOverride, providerKey,
  } = props;

  const shouldApplyNormalizeResultLocally = validationInstanceScopeOverride !== undefined;
  const state = useProductEditorModalState({ isOpen, providerKey, shouldApplyNormalizeResultLocally });

  useEffect(() => {
    if (showSkeleton === true) {
      state.setFormIsSaving(false);
      state.setFormHasUnsavedChanges(false);
    }
  }, [showSkeleton, state]);

  if (isOpen === false) return null;

  return (
    <FormModal
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      onSave={() => state.formSubmitRef.current?.()}
      isSaving={state.formIsSaving}
      disableCloseWhileSaving
      isSaveDisabled={showSkeleton === true || state.formIsSaving === true || isSaveDisabledOverride === true}
      hasUnsavedChanges={state.formHasUnsavedChanges}
      saveText={saveText}
      cancelText='Close'
      size='xl'
      className='md:min-w-[63rem] max-w-[66rem]'
    >
      {showSkeleton === true ? <EditProductSkeletonContent /> : <ProductEditorModalInner {...props} state={state} />}
    </FormModal>
  );
}
