'use client';

import React from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import { MetadataItem } from '@/shared/ui';

export function CategoryMapperStats(): React.JSX.Element {
  const { stats } = useCategoryMapper();

  return (
    <div className='flex gap-3 mb-4'>
      <MetadataItem label='Total Categories' value={stats.total} variant='minimal' />
      <MetadataItem
        label='Mapped'
        value={stats.mapped}
        variant='minimal'
        valueClassName='text-emerald-400 font-bold'
      />
      {stats.pending > 0 && (
        <MetadataItem
          label='Pending Changes'
          value={stats.pending}
          variant='minimal'
          valueClassName='text-yellow-400 font-bold'
        />
      )}
    </div>
  );
}
