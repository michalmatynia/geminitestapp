'use client';

import Link from 'next/link';
import React from 'react';

import { getStatusIcon } from '@/features/jobs/utils/job-icons';
import type { ExportJobDetail } from '@/shared/types/domain/integrations';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { AppModal, StatusBadge } from '@/shared/ui';

interface ExportJobDetailModalProps extends EntityModalProps<ExportJobDetail> {}

export function ExportJobDetailModal({
  isOpen,
  onClose,
  item: selectedListing,
}: ExportJobDetailModalProps): React.JSX.Element | null {
  if (!isOpen || !selectedListing) return null;

  const formatDateTime = (value: Date | string | null): string => {
    if (!value) return '—';
    const date: Date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  const selectedStatus = selectedListing.listing.status ?? '';

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title='Export Job Details'
      size='lg'
    >
      <div className='space-y-6 text-sm'>
        <div className='grid grid-cols-2 gap-4 rounded-md bg-gray-900 p-4'>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Status</div>
            <div className='mt-1'>
              <StatusBadge 
                status={selectedStatus || selectedListing.listing.status} 
                icon={getStatusIcon(selectedStatus || selectedListing.listing.status)}
              />
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Integration</div>
            <div className='text-white font-medium'>
              {selectedListing.listing.integrationName}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Connection</div>
            <div className='text-white font-medium'>
              {selectedListing.listing.connectionName}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Product</div>
            <div className='text-white font-medium'>
              {selectedListing.job.productName}
            </div>
            <div className='text-xs text-gray-500'>
                SKU: {selectedListing.job.productSku ?? '—'}
            </div>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4 rounded-md border border-border bg-card/60 p-4'>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Job ID</div>
            <div className='text-white font-mono text-xs'>
              {selectedListing.listing.id}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>External ID</div>
            <div className='text-white font-mono text-xs'>
              {selectedListing.listing.externalListingId ?? '—'}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Inventory ID</div>
            <div className='text-white font-mono text-xs'>
              {selectedListing.listing.inventoryId ?? '—'}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Created</div>
            <div className='text-white'>
              {formatDateTime(selectedListing.listing.createdAt)}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Updated</div>
            <div className='text-white'>
              {formatDateTime(selectedListing.listing.updatedAt)}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Listed At</div>
            <div className='text-white'>
              {formatDateTime(selectedListing.listing.listedAt)}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Integration ID</div>
            <div className='text-white font-mono text-xs'>
              {selectedListing.listing.integrationId}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Integration Slug</div>
            <div className='text-white font-mono text-xs'>
              {selectedListing.listing.integrationSlug}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Connection ID</div>
            <div className='text-white font-mono text-xs'>
              {selectedListing.listing.connectionId}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Product ID</div>
            <div className='text-white font-mono text-xs'>
              {selectedListing.job.productId}
            </div>
          </div>
          <div>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>Product Link</div>
            <Link
              href={`/admin/products?id=${selectedListing.job.productId}`}
              className='text-blue-400 hover:text-blue-300'
            >
                Open product
            </Link>
          </div>
        </div>


        <div className='grid grid-cols-1 gap-6'>
          <div className='space-y-2'>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>
                Listing Payload
            </div>
            <pre className='max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-border'>
              {JSON.stringify(selectedListing.listing, null, 2)}
            </pre>
          </div>
          <div className='space-y-2'>
            <div className='text-gray-500 uppercase text-[10px] font-bold'>
                Job Payload
            </div>
            <pre className='max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-border'>
              {JSON.stringify(selectedListing.job, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
