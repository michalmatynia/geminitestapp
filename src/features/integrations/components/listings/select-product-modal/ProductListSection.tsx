import React from 'react';

import type { ProductWithImages } from '@/features/products/types';
import { FormSection, SearchInput } from '@/shared/ui';

type ProductListProps = {
  isLoading: boolean;
  products: ProductWithImages[] | null | undefined;
  selectedProductId: string | null;
  onProductSelect: (productId: string) => void;
  productSearch: string;
  onSearchChange: (value: string) => void;
};

export function ProductListSection({
  isLoading,
  products,
  selectedProductId,
  onProductSelect,
  productSearch,
  onSearchChange,
}: ProductListProps): React.JSX.Element {
  return (
    <FormSection title='1. Select Product' variant='subtle' className='p-4 space-y-4'>
      <SearchInput
        placeholder='Search products...'
        value={productSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        onClear={() => onSearchChange('')}
      />

      <div className='space-y-2 max-h-[400px] overflow-y-auto rounded-md border border-border mt-4'>
        {isLoading ? (
          <p className='p-4 text-center text-xs text-gray-500'>Loading products...</p>
        ) : (products || []).length === 0 ? (
          <p className='p-4 text-center text-xs text-gray-500'>No products found.</p>
        ) : (
          (products || []).map((product: ProductWithImages) => (
            <button
              key={product.id}
              type='button'
              onClick={() => onProductSelect(product.id)}
              className={`w-full flex items-center justify-between p-3 text-left transition-colors border-b border-border last:border-0 ${
                selectedProductId === product.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50'
              }`}
            >
              <div>
                <p className='text-sm font-medium text-white line-clamp-1'>
                  {product.name_en || product.name_pl || 'Unnamed Product'}
                </p>
                <p className='text-xs text-gray-500'>SKU: {product.sku || '—'}</p>
              </div>
              {selectedProductId === product.id && <div className='size-2 rounded-full bg-primary' />}
            </button>
          ))
        )}
      </div>
    </FormSection>
  );
}
