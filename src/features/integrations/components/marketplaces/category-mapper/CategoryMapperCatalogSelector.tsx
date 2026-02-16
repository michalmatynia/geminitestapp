'use client';

import React, { useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import type { Catalog } from '@/features/products/types';
import { Label } from '@/shared/ui';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers';
import type { PickerGroup, PickerOption } from '@/shared/ui/templates/pickers/types';

export function CategoryMapperCatalogSelector(): React.JSX.Element {
  const {
    selectedCatalogId,
    setSelectedCatalogId,
    catalogsLoading,
    catalogs,
    internalCategories,
  } = useCategoryMapper();

  const groups = useMemo<PickerGroup[]>(() => [
    {
      label: 'Available Catalogs',
      options: catalogs.map((catalog: Catalog) => ({
        key: catalog.id,
        label: catalog.name,
      }))
    }
  ], [catalogs]);

  return (
    <div className='flex items-center gap-4'>
      <Label className='text-sm text-gray-400'>Target Catalog:</Label>
      <div className='w-[200px]'>
        <GenericPickerDropdown
          groups={groups}
          selectedKey={selectedCatalogId ?? ''}
          onSelect={(opt: PickerOption) => setSelectedCatalogId(opt.key)}
          triggerContent={
            <span className='text-sm truncate'>
              {catalogsLoading 
                ? 'Loading...' 
                : (catalogs.find(c => c.id === selectedCatalogId)?.name || 'Select catalog')}
            </span>
          }
          searchable={catalogs.length > 5}
          ariaLabel='Select target catalog'
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
