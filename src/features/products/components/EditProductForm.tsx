'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import ProductForm from '@/features/products/components/ProductForm';
import {
  ProductFormProvider,
  ProductFormProviderRuntimeContext,
} from '@/features/products/context/ProductFormContext';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import type { ProductWithImages } from '@/shared/contracts/products';
import { AdminProductsPageLayout, Button } from '@/shared/ui';

const FileManager = dynamic(() => import('@/shared/ui/files'), {
  ssr: false,
});

function EditProductForm(): React.JSX.Element {
  const { uploading, handleSubmit, hasUnsavedChanges } = useProductFormCore();
  const { showFileManager, handleMultiFileSelect } = useProductFormImages();
  const router = useRouter();
  const isSaveDisabled = uploading || !hasUnsavedChanges;

  return (
    <AdminProductsPageLayout
      title='Edit Product'
      current='Edit Product'
      headerActions={
        <>
          <Button
            onClick={() => router.push('/admin/products')}
            variant='outline'
            className='min-w-[100px] text-foreground'
            aria-label='Back to products'
          >
            Close
          </Button>
          <Button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isSaveDisabled}
            aria-disabled={isSaveDisabled}
            variant={hasUnsavedChanges ? 'success' : 'default'}
            className='min-w-[100px]'
          >
            {uploading ? 'Saving...' : 'Update'}
          </Button>
        </>
      }
      wrapInPanel
      panelClassName='shadow-lg'
    >
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} showFileManager={showFileManager} />
      ) : (
        <ProductForm submitButtonText='Update' validationInstanceScopeOverride='product_edit' />
      )}
    </AdminProductsPageLayout>
  );
}

export default function EditProductPage({
  product: initialProduct,
}: {
  product: ProductWithImages;
}): React.JSX.Element {
  const providerRuntimeValue = useMemo(
    () => ({
      product: initialProduct,
    }),
    [initialProduct]
  );

  return (
    <ProductFormProviderRuntimeContext.Provider value={providerRuntimeValue}>
      <ProductFormProvider>
        <EditProductForm />
      </ProductFormProvider>
    </ProductFormProviderRuntimeContext.Provider>
  );
}
