'use client';

'use no memo';

import React, { useEffect, useState } from 'react';

import { AdvancedFilterModal } from '@/features/products/components/list/advanced-filter';
import { useProductListFiltersContext } from '@/features/products/context/ProductListContext';
import { Button } from '@/shared/ui/button';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';

import { useProductFilterMetadata } from './ProductFilters.metadata';
import {
  buildProductFilterConfig,
  buildProductFilterValues,
  createProductFilterChangeHandler,
  createProductFilterPresetSaveHandler,
  createProductFiltersResetHandler,
} from './ProductFilters.model';

export { ProductSelectionActions } from './ProductSelectionActions';

type ProductFiltersProps = {
  instanceId?: string;
};

function ProductAdvancedFilterButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      size='sm'
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className='h-8 w-full sm:w-auto'
    >
      Advanced Filter
    </Button>
  );
}

export function ProductFilters({
  instanceId,
}: ProductFiltersProps): React.JSX.Element {
  const filters = useProductListFiltersContext();
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(
    filters.filtersCollapsedByDefault === false
  );
  const hasAdvancedFilter = filters.advancedFilter.trim().length > 0;
  const filterMetadataEnabled = isFilterPanelExpanded || isAdvancedFilterOpen;
  const { categoryOptions, advancedFieldValueOptions } = useProductFilterMetadata({
    catalogFilter: filters.catalogFilter,
    enabled: filterMetadataEnabled,
    nameLocale: filters.nameLocale,
  });

  useEffect(() => {
    setIsFilterPanelExpanded(filters.filtersCollapsedByDefault === false);
  }, [filters.filtersCollapsedByDefault]);

  return (
    <>
      <FilterPanel
        {...(instanceId !== undefined && instanceId.length > 0
          ? { idBase: `products-${instanceId}` }
          : {})}
        filters={buildProductFilterConfig(categoryOptions)}
        values={buildProductFilterValues(filters)}
        search={filters.search}
        searchPlaceholder='Search by product name...'
        onFilterChange={createProductFilterChangeHandler(filters)}
        onSearchChange={filters.setSearch}
        onReset={createProductFiltersResetHandler(filters)}
        actions={
          <ProductAdvancedFilterButton
            active={hasAdvancedFilter}
            onClick={() => setIsAdvancedFilterOpen(true)}
          />
        }
        collapsible
        defaultExpanded={filters.filtersCollapsedByDefault === false}
        onExpandedChange={setIsFilterPanelExpanded}
        toggleButtonAlignment='start'
        showHeader={false}
      />

      {isAdvancedFilterOpen ? (
        <AdvancedFilterModal
          open={isAdvancedFilterOpen}
          value={filters.advancedFilter}
          onClose={() => setIsAdvancedFilterOpen(false)}
          onApply={(value) => filters.setAdvancedFilterState(value, null)}
          onClear={() => filters.setAdvancedFilterState('', null)}
          onSavePreset={createProductFilterPresetSaveHandler(filters)}
          fieldValueOptions={advancedFieldValueOptions}
        />
      ) : null}
    </>
  );
}

ProductFilters.displayName = 'ProductFilters';
