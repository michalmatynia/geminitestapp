import React from 'react';

import type { GenericMapperStatsProps } from '@/shared/contracts/ui';
import { MetadataItem } from '../../metadata-item';

export type { GenericMapperStatsProps };

export function GenericMapperStats(props: GenericMapperStatsProps): React.JSX.Element {
  const { total, mapped, unmapped, pending, itemLabel = 'Items' } = props;

  return (
    <div className='flex gap-4 mb-4'>
      <MetadataItem label={`Total ${itemLabel}`} value={total} variant='minimal' />
      <MetadataItem
        label='Mapped'
        value={mapped}
        variant='minimal'
        valueClassName='text-emerald-400 font-bold'
      />
      {typeof unmapped === 'number' ? (
        <MetadataItem
          label='Unmapped'
          value={unmapped}
          variant='minimal'
          valueClassName='text-sky-300 font-bold'
        />
      ) : null}
      {pending > 0 && (
        <MetadataItem
          label='Pending'
          value={pending}
          variant='minimal'
          valueClassName='text-yellow-400 font-bold'
        />
      )}
    </div>
  );
}
