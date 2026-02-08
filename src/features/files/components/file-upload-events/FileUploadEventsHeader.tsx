'use client';

import React from 'react';

import { RefreshButton } from '@/shared/ui';

import { useFileUploadEventsContext } from '../../contexts/FileUploadEventsContext';

interface Props {
  title: string;
  description: string;
}

export function FileUploadEventsHeader({ title, description }: Props): React.JSX.Element {
  const { total, refetch, isFetching } = useFileUploadEventsContext();

  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <div>
        <h3 className='text-lg font-semibold text-white'>{title}</h3>
        <p className='text-sm text-gray-400'>{description}</p>
      </div>
      <div className='flex items-center gap-3'>
        <div className='text-[11px] text-gray-500'>
          Total: <span className='text-gray-300'>{total}</span>
        </div>
        <RefreshButton
          onRefresh={(): void => {
            void refetch();
          }}
          isRefreshing={isFetching}
        />
      </div>
    </div>
  );
}
