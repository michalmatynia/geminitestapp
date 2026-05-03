'use client';

import React from 'react';
import { ProductScanModal } from '@/features/products/components/list/ProductScanModal';
import type { ProductScanProvider } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';

type ProductFormScansModalProps = {
  provider: Extract<ProductScanProvider, 'amazon' | '1688'> | null;
  onClose: () => void;
  productId: string;
  product: ProductWithImages | undefined;
};

export function ProductFormScansModal({
  provider,
  onClose,
  productId,
  product,
}: ProductFormScansModalProps): React.JSX.Element | null {
  if (provider === null) return null;

  return (
    <ProductScanModal
      isOpen={true}
      onClose={onClose}
      productIds={[productId]}
      products={product !== undefined ? [product] : []}
      provider={provider}
    />
  );
}
