'use client';

import { ArrowRight, ArrowLeft, ArrowLeftRight, Check, X } from 'lucide-react';
import React from 'react';

import {
  useProductListingsData,
  useProductListingsModals,
  useProductListingsUIState,
} from '@/features/integrations/context/ProductListingsContext';
import type { SyncDirection } from '@/shared/contracts/products';
import { Button, Card, Hint, Badge } from '@/shared/ui';
import { cn } from '@/shared/utils';

const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export function ProductListingsSyncPanel(): React.JSX.Element {
  const { product, listings } = useProductListingsData();
  const { syncingImages } = useProductListingsUIState();
  const { setIsSyncImagesConfirmOpen } = useProductListingsModals();

  const baseListing = listings.find((listing) =>
    ['baselinker', 'base-com', 'base'].includes(normalizeIntegrationSlug(listing.integration.slug))
  );

  const syncFields = [
    {
      name: 'SKU',
      value: product.sku || '—',
      hasValue: !!product.sku,
      syncDirection: 'to_base' as SyncDirection,
    },
    {
      name: 'Name',
      value: product.name_en || '—',
      hasValue: !!product.name_en,
      syncDirection: 'to_base' as SyncDirection,
    },
    {
      name: 'Description',
      value: product.description_en ? `${product.description_en.slice(0, 50)}...` : '—',
      hasValue: !!product.description_en,
      syncDirection: 'to_base' as SyncDirection,
    },
    {
      name: 'Price',
      value:
        product.price !== null && product.price !== undefined ? `${product.price.toFixed(2)}` : '—',
      hasValue: product.price !== null && product.price !== undefined,
      syncDirection: 'to_base' as SyncDirection,
    },
    {
      name: 'Stock',
      value: product.stock !== null && product.stock !== undefined ? `${product.stock}` : '—',
      hasValue: product.stock !== null && product.stock !== undefined,
      syncDirection: 'to_base' as SyncDirection,
    },
    {
      name: 'EAN',
      value: product.ean || '—',
      hasValue: !!product.ean,
      syncDirection: 'to_base' as SyncDirection,
    },
    {
      name: 'Weight',
      value: product.weight !== null && product.weight !== undefined ? `${product.weight}g` : '—',
      hasValue: product.weight !== null && product.weight !== undefined,
      syncDirection: 'to_base' as SyncDirection,
    },
  ];

  const getSyncDirectionIcon = (direction: SyncDirection | 'none'): React.JSX.Element => {
    switch (direction) {
      case 'to_base':
        return <ArrowRight className='size-3 text-blue-400' />;
      case 'from_base':
        return <ArrowLeft className='size-3 text-purple-400' />;
      case 'bidirectional':
        return <ArrowLeftRight className='size-3 text-emerald-400' />;
      default:
        return <X className='size-3 text-gray-500' />;
    }
  };

  const activeFields = syncFields.filter((f) => f.hasValue);
  const imageLinkCount = Array.isArray(product.imageLinks) ? product.imageLinks.length : 0;
  const uploadCount = Array.isArray(product.images) ? product.images.length : 0;

  return (
    <Card variant='subtle' padding='md' className='bg-card/40 space-y-4'>
      <div className='flex items-center justify-between'>
        <h4 className='text-xs font-bold uppercase tracking-wider text-gray-400'>
          Sync Configuration
        </h4>
        <Badge
          variant='outline'
          className='bg-blue-500/5 text-blue-300 border-blue-500/20 text-[10px]'
        >
          One-way export
        </Badge>
      </div>

      <div className='space-y-1.5'>
        {syncFields.map((field) => (
          <div
            key={field.name}
            className={cn(
              'flex items-center justify-between rounded-md border border-white/5 px-3 py-2 transition-colors',
              field.hasValue ? 'bg-white/5' : 'bg-black/10 opacity-40 grayscale'
            )}
          >
            <div className='flex items-center gap-2.5 flex-1 min-w-0'>
              <div className='shrink-0'>
                {field.hasValue ? (
                  <Check className='size-3.5 text-emerald-400' />
                ) : (
                  <X className='size-3.5 text-gray-600' />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium truncate',
                  field.hasValue ? 'text-gray-200' : 'text-gray-500'
                )}
              >
                {field.name}
              </span>
            </div>
            <div className='flex items-center gap-4 shrink-0'>
              <span
                className='text-[11px] font-mono text-gray-400 max-w-[140px] truncate'
                title={field.value}
              >
                {field.value}
              </span>
              <div className='shrink-0'>
                {getSyncDirectionIcon(field.hasValue ? field.syncDirection : 'none')}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='border-t border-white/5 pt-3 flex items-center justify-between'>
        <Hint size='xxs' uppercase>
          {activeFields.length} of {syncFields.length} fields active
        </Hint>
        <div className='flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase'>
          <div className='flex items-center gap-1'>
            <ArrowRight className='size-2.5 text-blue-400' />
            <span>Export</span>
          </div>
          <div className='flex items-center gap-1 opacity-30'>
            <ArrowLeft className='size-2.5 text-purple-400' />
            <span>Import</span>
          </div>
        </div>
      </div>

      <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
        <div className='flex items-center justify-between'>
          <h5 className='text-xs font-bold uppercase tracking-wider text-gray-300'>Images</h5>
          <div className='flex gap-2'>
            <Badge variant='outline' className='text-[9px]'>
              Links: {imageLinkCount}
            </Badge>
            <Badge variant='outline' className='text-[9px]'>
              Files: {uploadCount}
            </Badge>
          </div>
        </div>
        <p className='text-[11px] text-gray-400 leading-relaxed'>
          Sync Base.com image URLs into product links to keep backups even if local uploads go
          missing.
        </p>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          disabled={!baseListing || syncingImages === baseListing.id}
          onClick={(): void => setIsSyncImagesConfirmOpen(true)}
          className='w-full'
          loading={syncingImages === baseListing?.id}
        >
          Sync Image URLs
        </Button>
        {!baseListing && (
          <Hint variant='warning' className='text-center'>
            Connect to Base.com to enable image sync.
          </Hint>
        )}
      </Card>
    </Card>
  );
}
