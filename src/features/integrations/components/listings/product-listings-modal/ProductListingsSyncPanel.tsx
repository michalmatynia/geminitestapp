'use client';

import { ArrowRight, ArrowLeft, ArrowLeftRight, Check, X } from 'lucide-react';
import React from 'react';

import { useProductListingsContext } from '@/features/integrations/context/ProductListingsContext';
import { SyncDirection } from '@/features/products/types';
import {
  Button,
  
} from '@/shared/ui';

const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export function ProductListingsSyncPanel(): React.JSX.Element {
  const { product, listings, syncingImages, setIsSyncImagesConfirmOpen } = useProductListingsContext();

  const baseListing = listings.find(
    (listing) => ['baselinker', 'base-com', 'base'].includes(normalizeIntegrationSlug(listing.integration.slug))
  );

  const getSyncFields = () => {
    return [
      {
        name: 'SKU',
        value: product.sku || '—',
        hasValue: !!product.sku,
        syncDirection: 'to_base' as SyncDirection,
        description: 'Product identifier',
      },
      {
        name: 'Name',
        value: product.name_en || '—',
        hasValue: !!product.name_en,
        syncDirection: 'to_base' as SyncDirection,
        description: 'Product name (English)',
      },
      {
        name: 'Description',
        value: product.description_en ? `${product.description_en.slice(0, 50)}...` : '—',
        hasValue: !!product.description_en,
        syncDirection: 'to_base' as SyncDirection,
        description: 'Product description (English)',
      },
      {
        name: 'Price',
        value: product.price !== null && product.price !== undefined ? `${product.price.toFixed(2)}` : '—',
        hasValue: product.price !== null && product.price !== undefined,
        syncDirection: 'to_base' as SyncDirection,
        description: 'Base price',
      },
      {
        name: 'Stock',
        value: product.stock !== null && product.stock !== undefined ? `${product.stock}` : '—',
        hasValue: product.stock !== null && product.stock !== undefined,
        syncDirection: 'to_base' as SyncDirection,
        description: 'Inventory quantity',
      },
      {
        name: 'EAN',
        value: product.ean || '—',
        hasValue: !!product.ean,
        syncDirection: 'to_base' as SyncDirection,
        description: 'Barcode / EAN',
      },
      {
        name: 'Weight',
        value: product.weight !== null && product.weight !== undefined ? `${product.weight}g` : '—',
        hasValue: product.weight !== null && product.weight !== undefined,
        syncDirection: 'to_base' as SyncDirection,
        description: 'Product weight',
      },
    ];
  };

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

  const getSyncDirectionLabel = (direction: SyncDirection | 'none'): string => {
    switch (direction) {
      case 'to_base':
        return 'To Base.com';
      case 'from_base':
        return 'From Base.com';
      case 'bidirectional':
        return 'Both ways';
      default:
        return 'Not synced';
    }
  };

  const syncFields = getSyncFields();
  const activeFields = syncFields.filter((f) => f.hasValue);
  const imageLinkCount = Array.isArray(product.imageLinks) ? product.imageLinks.length : 0;
  const uploadCount = Array.isArray(product.images) ? product.images.length : 0;

  return (
    <div className='rounded-lg border border-border/60 bg-card/40 p-3'>
      <div className='mb-3 flex items-center justify-between'>
        <h4 className='text-xs font-medium uppercase tracking-wide text-gray-400'>
          Sync Configuration
        </h4>
        <div className='flex items-center gap-1 text-[10px] text-gray-500'>
          <ArrowRight className='size-2.5' />
          <span>To Base.com only</span>
        </div>
      </div>

      <div className='mb-3 rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1.5'>
        <div className='flex items-center gap-2 text-xs text-blue-300'>
          <ArrowRight className='size-3' />
          <span>
            Currently configured for <strong>one-way export</strong> (Product &rarr; Base.com)
          </span>
        </div>
      </div>

      <div className='space-y-1'>
        {syncFields.map((field) => (
          <div
            key={field.name}
            className={`flex items-center justify-between rounded-md border border-border/40 px-2 py-1.5 text-xs ${
              field.hasValue
                ? 'bg-card/50'
                : 'bg-gray-900/20 opacity-50 border-none'
            }`}
          >
            <div className='flex items-center gap-2'>
              {field.hasValue ? (
                <Check className='size-3 text-emerald-400' />
              ) : (
                <X className='size-3 text-gray-600' />
              )}
              <span className={field.hasValue ? 'text-gray-200' : 'text-gray-500'}>
                {field.name}
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='max-w-[120px] truncate text-gray-400' title={field.value}>
                {field.value}
              </span>
              <div className='flex items-center gap-1' title={getSyncDirectionLabel(field.syncDirection)}>
                {getSyncDirectionIcon(field.hasValue ? field.syncDirection : 'none')}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='mt-3 border-t border-border pt-2'>
        <div className='flex items-center justify-between text-[10px] text-gray-500'>
          <span>{activeFields.length} of {syncFields.length} fields will be synced</span>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-1'>
              <ArrowRight className='size-2.5 text-blue-400' />
              <span>To Base</span>
            </div>
            <div className='flex items-center gap-1 opacity-40'>
              <ArrowLeft className='size-2.5 text-purple-400' />
              <span>From Base</span>
            </div>
            <div className='flex items-center gap-1 opacity-40'>
              <ArrowLeftRight className='size-2.5 text-emerald-400' />
              <span>Both</span>
            </div>
          </div>
        </div>
      </div>

      <div className='mt-4 rounded-md border border-border bg-card/50 p-3'>
        <div className='mb-2 flex items-center justify-between'>
          <h5 className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            Images
          </h5>
          <span className='text-[10px] text-gray-500'>
            Links: {imageLinkCount} · Uploads: {uploadCount}
          </span>
        </div>
        <p className='mb-3 text-xs text-gray-500'>
          Sync Base.com image URLs into product links to keep backups even if uploads go missing.
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!baseListing || syncingImages === baseListing.id}
          onClick={(): void => setIsSyncImagesConfirmOpen(true)}
          className='border-slate-500/40 text-slate-200 hover:bg-slate-500/10'
        >
          {syncingImages === baseListing?.id ? 'Syncing...' : 'Sync image URLs from Base.com'}
        </Button>
        {!baseListing && (
          <p className='mt-2 text-[10px] text-gray-500'>
            Connect this product to Base.com to enable image sync.
          </p>
        )}
      </div>
    </div>
  );
}
