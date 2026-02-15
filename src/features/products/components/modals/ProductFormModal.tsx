'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { TriggerButtonBar } from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import ProductForm from '@/features/products/components/ProductForm';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import type { ModalStateProps } from '@/shared/types/modal-props';
import { AppModal, Button } from '@/shared/ui';

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
  const { showFileManager, handleMultiFileSelect, handleSubmit, uploading, getValues, product, draft } =
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

  const header = (
    <div className='flex items-center justify-between gap-3 w-full'>
      <div className='flex items-center gap-4'>
        <Button
          onClick={() => {
            void handleSubmit();
          }}
          disabled={uploading}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          {uploading ? 'Saving...' : submitButtonText}
        </Button>
        <div className='flex items-center gap-2'>
          <h2 className='text-2xl font-bold text-white'>{title}</h2>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <TriggerButtonBar
          location='product_modal'
          entityType='product'
          entityId={product?.id ?? null}
          getEntityJson={getEntityJson}
        />
        <Button
          type='button'
          onClick={onClose}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <AppModal 
      open={isOpen}
      onClose={onClose}
      title={title} 
      header={header}
      className='md:min-w-[63rem] max-w-[66rem]'
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
    </AppModal>
  );
}

export function ProductFormModal(props: ProductFormModalProps): React.JSX.Element | null {
  if (!props.isOpen) return null;
  return <ProductFormModalInner {...props} />;
}
