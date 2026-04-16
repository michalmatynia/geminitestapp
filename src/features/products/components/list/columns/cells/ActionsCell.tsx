'use client';

import { memo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Row } from '@tanstack/react-table';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { useProductListRowActionsContext, useProductListRowRuntime } from '@/features/products/context/ProductListContext';
import { ActionMenu } from '@/shared/ui/ActionMenu';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';

const TraderaLinkModal = dynamic(
  () =>
    import('../../TraderaLinkModal').then(
      (mod) => mod.TraderaLinkModal
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

interface ActionsCellProps {
  row: Row<ProductWithImages>;
}

function ActionsCellMenu({ 
  product, 
  showTraderaBadge, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  onLinkTradera 
}: { 
  product: ProductWithImages, 
  showTraderaBadge: boolean, 
  onEdit: (p: ProductWithImages) => void, 
  onDuplicate: (p: ProductWithImages) => void, 
  onDelete: (p: ProductWithImages) => void, 
  onLinkTradera: () => void 
}): React.JSX.Element {
  return (
    <ActionMenu ariaLabel='Open row actions'>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(product); }}>Edit</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onDuplicate(product); }}>Duplicate</DropdownMenuItem>
      {showTraderaBadge && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onLinkTradera(); }}>Link Tradera Listing</DropdownMenuItem>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem className='text-destructive focus:text-destructive' onSelect={(e) => { e.preventDefault(); onDelete(product); }}>Remove</DropdownMenuItem>
    </ActionMenu>
  );
}

export const ActionsCell: React.FC<ActionsCellProps> = memo(({ row }) => {
  const product = row.original;
  const actions = useProductListRowActionsContext();
  const { showTraderaBadge } = useProductListRowRuntime(product.id, product.baseProductId);
  const [traderaLinkOpen, setTraderaLinkOpen] = useState(false);

  return (
    <div className='flex justify-end' onMouseEnter={() => actions.onPrefetchProductDetail(product.id)}>
      <ActionsCellMenu
        product={product}
        showTraderaBadge={showTraderaBadge}
        onEdit={(p) => actions.onProductEditClick(p)}
        onDuplicate={(p) => actions.onDuplicateProduct(p)}
        onDelete={(p) => actions.onProductDeleteClick(p)}
        onLinkTradera={() => setTraderaLinkOpen(true)}
      />
      {traderaLinkOpen && <TraderaLinkModal isOpen={traderaLinkOpen} product={product} onClose={() => setTraderaLinkOpen(false)} />}
    </div>
  );
});

ActionsCell.displayName = 'ActionsCell';
