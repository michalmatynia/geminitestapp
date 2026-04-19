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

const statusVariant = (
  status: 'success' | 'skipped' | 'failed'
): 'success' | 'neutral' | 'error' => {
  if (status === 'success') return 'success';
  if (status === 'skipped') return 'neutral';
  return 'error';
};

export function ProductBulkSyncResultsModal(
  props: ProductBulkSyncResultsModalProps
): React.JSX.Element {
  const { isOpen, onClose, response, products } = props;

  const productNamesById = useMemo(
    () =>
      new Map(
        products.map((p: ProductWithImages) => [p.id, p.name_en || p.name_pl || p.name_de || p.id])
      ),
    [products]
  );

  const totals = response?.totals ?? { requested: 0, success: 0, skipped: 0, failed: 0 };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Base.com Sync Results'
      subtitle={
        response
          ? `${response.profileName}: ${totals.success} succeeded, ${totals.skipped} skipped, ${totals.failed} failed (of ${totals.requested})`
          : 'No results yet.'
      }
      size='lg'
      footer={
        <Button type='button' variant='outline' onClick={onClose}>
          Close
        </Button>
      }
    >
      {!response || response.items.length === 0 ? (
        <p className='text-sm text-muted-foreground'>No items to show.</p>
      ) : (
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
                <tr key={item.productId} className='border-t border-border/60'>
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
                  <td className='px-3 py-2 text-gray-300'>
                    {item.localChanges.length > 0 ? item.localChanges.join(', ') : '—'}
                  </td>
                  <td className='px-3 py-2 text-gray-300'>
                    {item.baseChanges.length > 0 ? item.baseChanges.join(', ') : '—'}
                  </td>
                  <td className='px-3 py-2 text-gray-400'>
                    {item.errorMessage ?? item.message ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppModal>
  );
}
