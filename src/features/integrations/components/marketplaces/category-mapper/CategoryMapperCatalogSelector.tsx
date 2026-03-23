'use client';

import React, { useMemo } from 'react';

import { useCategoryMapperData } from '@/features/integrations/context/CategoryMapperContext';
import { Label, SelectSimple } from '@/shared/ui';

export function CategoryMapperCatalogSelector(): React.JSX.Element {
  const { selectedCatalogId, setSelectedCatalogId, catalogsLoading, catalogs, internalCategories } =
    useCategoryMapperData();

  const catalogOptions = useMemo(
    () =>
      catalogs.map((catalog) => ({
        value: catalog.id,
        label: catalog.name,
      })),
    [catalogs]
  );

  return (
    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
      <Label className='text-sm font-medium text-foreground'>Target Catalog</Label>
      <div className='w-full sm:w-[260px]'>
        <SelectSimple
          size='sm'
          value={selectedCatalogId ?? undefined}
          onValueChange={setSelectedCatalogId}
          options={catalogOptions}
          placeholder={catalogsLoading ? 'Loading catalogs...' : 'Select catalog'}
          disabled={catalogsLoading || catalogOptions.length === 0}
          ariaLabel='Target catalog'
          title='Target catalog'
        />
      </div>

      {selectedCatalogId && (
        <span className='text-xs text-gray-500'>
          {internalCategories.length} internal categories
        </span>
      )}
    </div>
  );
}
