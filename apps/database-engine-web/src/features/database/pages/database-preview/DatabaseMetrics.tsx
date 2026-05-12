import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

type DatabaseMetricsProps = {
  databaseSize: string | null;
  tablesCount: number;
  enumsCount: number;
  totalIndexes: number;
  totalFks: number;
};

export const DatabaseMetrics = ({
  databaseSize,
  tablesCount,
  enumsCount,
  totalIndexes,
  totalFks,
}: DatabaseMetricsProps): JSX.Element => {
  const showDatabaseSize = databaseSize !== null && databaseSize !== '';

  return (
  <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 lg:grid-cols-5`}>
    {showDatabaseSize && (
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
};
