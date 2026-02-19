'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { TriggerButtonBar } from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import ProductForm from '@/features/products/components/ProductForm';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import type { ModalStateProps } from '@/shared/types/modal-props';
import { FormModal } from '@/shared/ui';

const FileManager = dynamic(() => import('@/features/files/components/FileManager'), {
  ssr: false,
});

interface ProductFormModalProps extends ModalStateProps {
  title: string;
  submitButtonText: string;
  validationInstanceScopeOverride?: 'draft_template' | 'product_create' | 'product_edit';
}

function ProductFormModalInner({
  isOpen,
  onClose,
  title,
  submitButtonText,
  validationInstanceScopeOverride,
}: ProductFormModalProps): React.JSX.Element {
  const {
    showFileManager,
    handleMultiFileSelect,
    handleSubmit,
    uploading,
    getValues,
    product,
    draft,
    hasUnsavedChanges,
  } =
    useProductFormContext();
  const formInstanceKey = product?.id?.trim() || draft?.id?.trim() || 'product-create';

  const getEntityJson = (): Record<string, unknown> => {
    const values = getValues() as unknown as Record<string, unknown>;
    const base = (product ?? {}) as unknown as Record<string, unknown>;
    return {
      ...base,
      ...values,
      ...(product?.id ? { id: product.id } : {}),
    };
  };

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
      onSave={() => { void handleSubmit(); }}
      isSaving={uploading}
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
          {...(
            validationInstanceScopeOverride
              ? { validationInstanceScopeOverride }
              : {}
          )}
        />
      )}
    </FormModal>
  );
}

export function ProductFormModal(props: ProductFormModalProps): React.JSX.Element | null {
  if (!props.isOpen) return null;
  return <ProductFormModalInner {...props} />;
}
