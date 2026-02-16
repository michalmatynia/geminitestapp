'use client';

import React from 'react';

import type { EntityModalProps } from '@/shared/types/modal-props';
import { DetailModal } from '@/shared/ui/templates/modals';

export interface ExportJobDetailModalProps extends EntityModalProps<any, any> {}

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

  const listing = selectedListing.listing || {};
  const selectedStatus = listing.status ?? 'n/a';

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Export Job Details'
      size='lg'
    >
      <div className='space-y-6 text-sm'>
        <div className='rounded-lg border border-border/60 bg-card/35 p-4'>
          <h3 className='text-sm font-medium text-white mb-4'>Listing Information</h3>
          <div className='grid grid-cols-2 gap-y-4'>
            <div>
              <p className='text-gray-500'>External ID</p>
              <p className='text-gray-200 font-mono'>{listing.externalListingId || 'n/a'}</p>
            </div>
            <div>
              <p className='text-gray-500'>Status</p>
              <p className='text-gray-200'>{selectedStatus}</p>
            </div>
            <div>
              <p className='text-gray-500'>Source</p>
              <p className='text-gray-200'>{listing.source || 'n/a'}</p>
            </div>
            <div>
              <p className='text-gray-500'>Last Sync</p>
              <p className='text-gray-200'>{formatDateTime(listing.updatedAt)}</p>
            </div>
          </div>
        </div>

        {selectedListing.history && (
          <div className='rounded-lg border border-border/60 bg-card/35 p-4'>
            <h3 className='text-sm font-medium text-white mb-4'>Sync History</h3>
            <div className='space-y-2'>
              {selectedListing.history.length === 0 ? (
                <p className='text-gray-500 italic'>No history available.</p>
              ) : (
                selectedListing.history.map((entry: any, i: number) => (
                  <div key={i} className='flex justify-between border-b border-border/30 pb-2 text-[11px]'>
                    <span className='text-gray-300'>{entry.message}</span>
                    <span className='text-gray-500'>{formatDateTime(entry.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </DetailModal>
  );
}
