'use client';

import dynamic from 'next/dynamic';
import React, { useCallback } from 'react';

import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';
import ProductForm from '@/features/products/components/ProductForm';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import type { ModalStateProps } from '@/shared/contracts/ui';
import { FormModal } from '@/shared/ui';

const FileManager = dynamic(() => import('@/features/files/components/FileManager'), {
  ssr: false,
});

interface ProductFormModalProps extends ModalStateProps {
  title: string;
  submitButtonText: string;
  validationInstanceScopeOverride?: 'draft_template' | 'product_create' | 'product_edit';
}

function ProductFormModalInner(props: ProductFormModalProps): React.JSX.Element {
  const { isOpen, onClose, title, submitButtonText, validationInstanceScopeOverride } = props;

  const {
    showFileManager,
    handleMultiFileSelect,
    handleSubmit,
    uploading,
    getValues,
    product,
    draft,
    hasUnsavedChanges,
  } = useProductFormContext();
  const formInstanceKey = product?.id?.trim() || draft?.id?.trim() || 'product-create';

  const getEntityJson = useCallback((): Record<string, unknown> => {
    const values = getValues() as unknown as Record<string, unknown>;
    const base = (product ?? {}) as unknown as Record<string, unknown>;
    return {
      ...base,
      ...values,
      ...(product?.id ? { id: product.id } : {}),
    };
  }, [getValues, product]);

  const actions = (
    <TriggerButtonBar
      location='product_modal'
      entityType='product'
      entityId={product?.id ?? null}
      getEntityJson={getEntityJson}
    />
  );

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={title}
      onSave={() => {
        void handleSubmit();
      }}
      isSaving={uploading}
      disableCloseWhileSaving
      hasUnsavedChanges={hasUnsavedChanges}
      saveText={submitButtonText}
      cancelText='Close'
      size='xl'
      className='md:min-w-[63rem] max-w-[66rem]'
      actions={actions}
    >
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} />
      ) : (
        <ProductForm
          key={formInstanceKey}
          submitButtonText={submitButtonText}
          validationInstanceScopeOverride={validationInstanceScopeOverride}
        />
      )}
    </FormModal>
  );
}

export function ProductFormModal(props: ProductFormModalProps): React.JSX.Element | null {
  const { isOpen, onClose, title, submitButtonText, validationInstanceScopeOverride } = props;

  if (!isOpen) return null;
  return (
    <ProductFormModalInner
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      submitButtonText={submitButtonText}
      validationInstanceScopeOverride={validationInstanceScopeOverride}
    />
  );
}
