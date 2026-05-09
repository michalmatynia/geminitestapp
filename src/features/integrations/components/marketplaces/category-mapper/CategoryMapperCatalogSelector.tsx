'use client';

import React, { useMemo } from 'react';

import {
  useCategoryMapperConfig,
  useCategoryMapperData,
} from '@/features/integrations/context/CategoryMapperContext';
import { Label } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

export function CategoryMapperCatalogSelector(): React.JSX.Element {
  const config = useCategoryMapperConfig();
  const { selectedCatalogId, setSelectedCatalogId, catalogsLoading, catalogs, internalCategories } =
    useCategoryMapperData();
  const isTraderaConnection = (config.integrationSlug ?? '').trim().toLowerCase() === 'tradera';

  const catalogOptions = useMemo(
    () =>
      catalogs.map((catalog) => ({
        value: catalog.id,
        label: catalog.name,
      })),
    [catalogs]
  );

  return isTraderaConnection ? (
    <div className='flex min-h-8 items-center text-xs text-muted-foreground'>
      All internal categories
    </div>
  ) : (
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
