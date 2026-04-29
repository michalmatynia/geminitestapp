'use client';

import { useMemo } from 'react';

import type { ProductSyncBulkResponse } from '@/shared/contracts/product-sync';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { AppModal } from '@/shared/ui/app-modal';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

interface ProductBulkSyncResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: ProductSyncBulkResponse | null;
  products: ProductWithImages[];
}

type ProductBulkSyncItem = ProductSyncBulkResponse['items'][number];
type ProductBulkSyncTotals = ProductSyncBulkResponse['totals'];
type ProductNameLookup = ReadonlyMap<string, string>;

const statusVariant = (
  status: 'success' | 'skipped' | 'failed'
): 'success' | 'neutral' | 'error' => {
  if (status === 'success') return 'success';
  if (status === 'skipped') return 'neutral';
  return 'error';
};

const normalizeProductName = (product: ProductWithImages): string => {
  if (product.name_en !== '') return product.name_en;
  if (product.name_pl !== '') return product.name_pl;
  if (product.name_de !== '') return product.name_de;
  return product.id;
};

const buildProductNamesById = (products: readonly ProductWithImages[]): ProductNameLookup =>
  new Map(products.map((product) => [product.id, normalizeProductName(product)]));

const resolveResultsSubtitle = (
  response: ProductSyncBulkResponse | null,
  totals: ProductBulkSyncTotals
): string => {
  if (response === null) return 'No results yet.';
  return `${response.profileName}: ${totals.success} succeeded, ${totals.skipped} skipped, ${totals.failed} failed (of ${totals.requested})`;
};

const formatSyncChanges = (changes: readonly string[]): string =>
  changes.length > 0 ? changes.join(', ') : '—';

export function ProductBulkSyncResultsModal(
  props: ProductBulkSyncResultsModalProps
): React.JSX.Element {
  const { isOpen, onClose, response, products } = props;

  const productNamesById = useMemo(
    () => buildProductNamesById(products),
    [products]
  );

  const totals = response?.totals ?? { requested: 0, success: 0, skipped: 0, failed: 0 };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Base.com Sync Results'
      subtitle={resolveResultsSubtitle(response, totals)}
      size='lg'
      footer={
        <Button type='button' variant='outline' onClick={onClose}>
          Close
        </Button>
      }
    >
      <ProductBulkSyncResultsTable response={response} productNamesById={productNamesById} />
    </AppModal>
  );
}

function ProductBulkSyncResultsTable({
  response,
  productNamesById,
}: {
  response: ProductSyncBulkResponse | null;
  productNamesById: ProductNameLookup;
}): React.JSX.Element {
  if (response === null || response.items.length === 0) {
    return <p className='text-sm text-muted-foreground'>No items to show.</p>;
  }

  return (
    <div className='overflow-hidden rounded-md border border-border/60'>
      <table className='w-full text-xs'>
        <thead className='bg-muted/40 text-left'>
          <tr>
            <th className='px-3 py-2 font-medium'>Product</th>
            <th className='px-3 py-2 font-medium'>Status</th>
            <th className='px-3 py-2 font-medium'>Local changes</th>
            <th className='px-3 py-2 font-medium'>Base changes</th>
            <th className='px-3 py-2 font-medium'>Message</th>
          </tr>
        </thead>
        <tbody>
          {response.items.map((item) => (
            <ProductBulkSyncResultsRow
              key={item.productId}
              item={item}
              productNamesById={productNamesById}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductBulkSyncResultsRow({
  item,
  productNamesById,
}: {
  item: ProductBulkSyncItem;
  productNamesById: ProductNameLookup;
}): React.JSX.Element {
  return (
    <tr className='border-t border-border/60'>
      <td className='px-3 py-2'>
        <div className='font-medium text-gray-200 truncate max-w-[220px]'>
          {productNamesById.get(item.productId) ?? item.productId}
        </div>
        <div className='font-mono text-[10px] text-gray-500'>{item.productId}</div>
      </td>
      <td className='px-3 py-2'>
        <Badge variant={statusVariant(item.status)} className='uppercase text-[10px]'>
          {item.status}
        </Badge>
      </td>
      <td className='px-3 py-2 text-gray-300'>{formatSyncChanges(item.localChanges)}</td>
      <td className='px-3 py-2 text-gray-300'>{formatSyncChanges(item.baseChanges)}</td>
      <td className='px-3 py-2 text-gray-400'>{item.errorMessage ?? item.message ?? '—'}</td>
    </tr>
  );
}
