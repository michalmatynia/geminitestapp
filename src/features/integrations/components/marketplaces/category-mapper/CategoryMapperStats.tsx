'use client';

import React from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';

export function CategoryMapperStats(): React.JSX.Element {
  const { stats } = useCategoryMapper();

  return (
    <div className='flex gap-6 text-sm'>
      <div className='text-gray-400'>
        Total: <span className='text-white'>{stats.total}</span>
      </div>
      <div className='text-gray-400'>
        Mapped: <span className='text-emerald-400'>{stats.mapped}</span>
      </div>
      {stats.pending > 0 && (
        <div className='text-gray-400'>
          Unsaved changes: <span className='text-yellow-400'>{stats.pending}</span>
        </div>
      )}
    </div>
  );
}
