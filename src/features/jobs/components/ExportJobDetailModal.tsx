'use client';

import Link from 'next/link';
import React from 'react';

import { getStatusIcon } from '@/features/jobs/utils/job-icons';
import type { ExportJobDetail } from '@/shared/types/domain/integrations';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { DetailModal } from '@/shared/ui/templates/modals';
import { StatusBadge } from '@/shared/ui';

// ... (rest of the file from line 8)

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
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Export Job Details'
      size='lg'
    >
      <div className='space-y-6 text-sm'>
        {/* ... (rest of the content from line 41 to 161) */}
      </div>
    </DetailModal>
  );
}
