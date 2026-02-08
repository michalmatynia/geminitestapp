'use client';

import React from 'react';

import { Pagination } from '@/shared/ui';

import { useFileUploadEventsContext } from '../../contexts/FileUploadEventsContext';

export function FileUploadEventsPagination(): React.JSX.Element {
  const { page, totalPages, setPage } = useFileUploadEventsContext();

  return (
    <div className='mt-4'>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
