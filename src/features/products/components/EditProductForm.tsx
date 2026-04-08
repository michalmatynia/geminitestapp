'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState, startTransition } from 'react';

import ProductForm from '@/features/products/components/ProductForm';
import {
  ProductFormProvider,
  ProductFormProviderRuntimeContext,
} from '@/features/products/context/ProductFormContext';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { Button } from '@/shared/ui/button';

const FileManager = dynamic(() => import('@/features/files/public').then(m => m.default || m.FileManager), {
  ssr: false,
});

function EditProductForm(): React.JSX.Element {
  const { uploading, handleSubmit, hasUnsavedChanges } = useProductFormCore();
  const { showFileManager, handleMultiFileSelect } = useProductFormImages();
  const router = useRouter();
  const isSaveDisabled = uploading || !hasUnsavedChanges;
  const [validatorSessionKey] = useState<string>(() =>
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `edit-product-validator-${Date.now().toString(36)}`
  );

  return (
    <AdminProductsPageLayout
      title='Edit Product'
      current='Edit Product'
      headerActions={
        <>
          <Button
            onClick={() => startTransition(() => { router.push('/admin/products'); })}
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
        <ProductForm
          submitButtonText='Update'
          validationInstanceScopeOverride='product_edit'
          validatorSessionKey={validatorSessionKey}
        />
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
