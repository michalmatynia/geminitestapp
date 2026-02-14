'use client';

import React from 'react';

import { DataTable } from '@/shared/ui';

import { useFileUploadEventsTableProps } from '../../hooks/useFileUploadEventsTableProps';

export function FileUploadEventsTable(): React.JSX.Element {
  const tableProps = useFileUploadEventsTableProps();

  return (
    <div className='mt-4 overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
      <DataTable {...tableProps} />
    </div>
  );
}
