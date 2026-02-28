'use client';

import React from 'react';

import { StandardDataTablePanel } from '@/shared/ui';

import { useFileUploadEventsTableProps } from '../../hooks/useFileUploadEventsTableProps';

export function FileUploadEventsTable(): React.JSX.Element {
  const tableProps = useFileUploadEventsTableProps();

  return (
    <div className='mt-4'>
      <StandardDataTablePanel {...tableProps} />
    </div>
  );
}
