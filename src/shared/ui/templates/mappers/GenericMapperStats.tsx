import React from 'react';
import { MetadataItem } from '../../metadata-item';

export type GenericMapperStatsProps = {
  total: number;
  mapped: number;
  pending: number;
  itemLabel?: string;
};

export function GenericMapperStats(props: GenericMapperStatsProps): React.JSX.Element {
  const { total, mapped, pending, itemLabel = 'Items' } = props;

  return (
    <div className='flex gap-4 mb-4'>
      <MetadataItem label={`Total ${itemLabel}`} value={total} variant='minimal' />
      <MetadataItem
        label='Mapped'
        value={mapped}
        variant='minimal'
        valueClassName='text-emerald-400 font-bold'
      />
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
