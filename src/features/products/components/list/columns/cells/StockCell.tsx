'use client';

import { memo } from 'react';
import type { Row } from '@tanstack/react-table';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { EditableCell } from '@/features/products/components/EditableCell';

export const StockCell: React.FC<{ row: Row<ProductWithImages> }> = memo(({ row }) => {
  const product: ProductWithImages = row.original;

  return (
    <EditableCell
      value={product.stock}
      productId={product.id}
      field='stock'
      onUpdate={(): void => {
        // Handled optimistically
      }}
    />
  );
});

StockCell.displayName = 'StockCell';
