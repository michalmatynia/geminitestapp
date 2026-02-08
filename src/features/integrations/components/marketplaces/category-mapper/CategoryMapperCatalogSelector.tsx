'use client';

import React from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import type { Catalog } from '@/features/products/types';
import { Label, UnifiedSelect } from '@/shared/ui';

export function CategoryMapperCatalogSelector(): React.JSX.Element {
  const {
    selectedCatalogId,
    setSelectedCatalogId,
    catalogsLoading,
    catalogs,
    internalCategories,
  } = useCategoryMapper();

  return (
    <div className='flex items-center gap-4'>
      <Label className='text-sm text-gray-400'>Target Catalog:</Label>
      <div className='w-[200px]'>
        <UnifiedSelect
          value={selectedCatalogId ?? '__none__'}
          onValueChange={(v: string): void => setSelectedCatalogId(v === '__none__' ? null : v)}
          disabled={catalogsLoading}
          options={[
            ...(!catalogsLoading && catalogs.length === 0 ? [{ value: '__none__', label: 'No catalogs available' }] : []),
            ...catalogs.map((catalog: Catalog) => ({ value: catalog.id, label: catalog.name }))
          ]}
          placeholder={catalogsLoading ? 'Loading...' : 'Select catalog'}
          triggerClassName='bg-gray-800 border-border text-white text-sm h-9'
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
