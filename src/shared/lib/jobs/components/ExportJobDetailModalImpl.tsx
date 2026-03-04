import React from 'react';

import type { ListingAttempt, ListingJob, ProductJob } from '@/shared/contracts/integrations';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { StatusBadge } from '@/shared/ui';
import { DetailModal, DetailModalSection } from '@/shared/ui/templates/modals';
import { formatDateTime } from '@/shared/utils';

export interface ExportJobDetailItem {
  job: ProductJob;
  listing: ListingJob;
  history?: ListingAttempt[];
}

export interface ExportJobDetailModalProps extends EntityModalProps<ExportJobDetailItem, never> {}

export function ExportJobDetailModal(
  props: ExportJobDetailModalProps
): React.JSX.Element | null {
  const { isOpen, onClose, item: selectedListing } = props;

  if (!isOpen || !selectedListing) return null;

  const listing = selectedListing.listing;
  const selectedStatus = listing.status ?? 'n/a';

  return (
    <DetailModal isOpen={isOpen} onClose={onClose} title='Export Job Details' size='lg'>
      <div className='space-y-6 text-sm'>
        <DetailModalSection title='Listing Information'>
          <div className='grid grid-cols-2 gap-y-4'>
            <div>
              <p className='text-gray-500 mb-1'>External ID</p>
              <p className='text-gray-200 font-mono'>{listing.externalListingId || 'n/a'}</p>
            </div>
            <div>
              <p className='text-gray-500 mb-1'>Status</p>
              <StatusBadge status={selectedStatus} />
            </div>
            <div>
              <p className='text-gray-500'>Source</p>
              <p className='text-gray-200'>{listing.integrationName || 'n/a'}</p>
            </div>
            <div>
              <p className='text-gray-500'>Last Sync</p>
              <p className='text-gray-200'>{formatDateTime(listing.updatedAt)}</p>
            </div>
          </div>
        </DetailModalSection>

        {selectedListing.listing.exportHistory && (
          <DetailModalSection title='Sync History'>
            <div className='space-y-2'>
              {selectedListing.listing.exportHistory.length === 0 ? (
                <p className='text-gray-500 italic'>No history available.</p>
              ) : (
                selectedListing.listing.exportHistory.map((entry: ListingAttempt, i: number) => (
                  <div
                    key={i}
                    className='flex justify-between border-b border-border/30 pb-2 text-[11px]'
                  >
                    <span className='text-gray-300'>
                      {entry.status || entry.failureReason || 'Sync attempt'}
                    </span>
                    <span className='text-gray-500'>{formatDateTime(entry.exportedAt)}</span>
                  </div>
                ))
              )}
            </div>
          </DetailModalSection>
        )}
      </div>
    </DetailModal>
  );
}
