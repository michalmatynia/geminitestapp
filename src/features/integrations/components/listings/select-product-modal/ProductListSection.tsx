import React from 'react';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { FormSection, SearchInput } from '@/shared/ui/forms-and-actions.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { resolveProductListingsProductName } from '../product-listings-labels';
import { useSelectProductForListingModalContext } from './context/SelectProductForListingModalContext';

export function ProductListSection(): React.JSX.Element {
  const {
    isLoadingProducts,
    products,
    selectedProductId,
    setSelectedProductId,
    productSearch,
    setProductSearch,
  } = useSelectProductForListingModalContext();

  return (
    <FormSection title='1. Select Product' variant='subtle' className='p-4 space-y-4'>
      <SearchInput
        placeholder='Search products...'
        value={productSearch}
        onChange={(e) => setProductSearch(e.target.value)}
        onClear={() => setProductSearch('')}
        size='sm'
      />

      <div className='space-y-2 max-h-[400px] overflow-y-auto rounded-md border border-border mt-4'>
        {isLoadingProducts ? (
          <LoadingState message='Loading products...' size='sm' className='py-12' />
        ) : (products || []).length === 0 ? (
          <p className='p-4 text-center text-xs text-gray-500'>No products found.</p>
        ) : (
          (products || []).map((product: ProductWithImages) => (
            <Button
              key={product.id}
              variant='ghost'
              onClick={() => setSelectedProductId(product.id)}
              className={cn(
                'w-full flex items-center justify-between p-3 h-auto text-left transition-colors border-b border-border last:border-0 rounded-none font-normal',
                selectedProductId === product.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'hover:bg-muted/50'
              )}
            >
              <div className='min-w-0 flex-1'>
                <p className='text-sm font-medium text-white truncate'>
                  {resolveProductListingsProductName(product)}
                </p>
                <p className='text-xs text-gray-500'>SKU: {product.sku || '—'}</p>
              </div>
              {selectedProductId === product.id && (
                <div className='size-2 rounded-full bg-primary shrink-0 ml-2' />
              )}
            </Button>
          ))
        )}
      </div>
    </FormSection>
  );
}
