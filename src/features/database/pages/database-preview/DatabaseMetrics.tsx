import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

export const DatabaseMetrics = ({
  databaseSize,
  tablesCount,
  enumsCount,
  totalIndexes,
  totalFks,
}: {
  databaseSize: string | null;
  tablesCount: number;
  enumsCount: number;
  totalIndexes: number;
  totalFks: number;
}) => (
  <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 lg:grid-cols-5`}>
    {databaseSize && (
      <MetadataItem
        label='Total Size'
        value={databaseSize}
        variant='card'
        valueClassName='text-lg font-semibold text-white mt-1'
        className='p-4'
      />
    )}
    <MetadataItem
      label='Tables'
      value={tablesCount}
      variant='card'
      valueClassName='text-lg font-semibold text-white mt-1'
      className='p-4'
    />
    <MetadataItem
      label='Enums'
      value={enumsCount}
      variant='card'
      valueClassName='text-lg font-semibold text-white mt-1'
      className='p-4'
    />
    <MetadataItem
      label='Indexes'
      value={totalIndexes}
      variant='card'
      valueClassName='text-lg font-semibold text-white mt-1'
      className='p-4'
    />
    <MetadataItem
      label='Relations'
      value={totalFks}
      variant='card'
      valueClassName='text-lg font-semibold text-white mt-1'
      className='p-4'
    />
  </div>
);
