'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';

import { AdvancedFilterModal } from '@/features/products/components/list/advanced-filter';
import { useProductListFiltersContext } from '@/features/products/context/ProductListContext';
import { useProductCategories } from '@/features/products/hooks/useCategoryQueries';
import {
  useCatalogs,
  useMultiTags,
  useProducers,
  useTags,
} from '@/features/products/hooks/useProductMetadataQueries';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import type {
  ProductAdvancedFilterField,
  ProductAdvancedFilterGroup,
  ProductCategory,
} from '@/shared/contracts/products';
import { Button } from '@/shared/ui';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

import {
  createAdvancedPreset,
  hasPresetNameConflict,
  normalizePresetName,
} from './product-filters-utils';

export { ProductSelectionActions } from './ProductSelectionActions';

export const ProductFilters = memo(function ProductFilters(): React.JSX.Element {
  const {
    search,
    setSearch,
    productId,
    setProductId,
    idMatchMode,
    setIdMatchMode,
    sku,
    setSku,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    nameLocale,
    catalogFilter,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    stockValue,
    setStockValue,
    stockOperator,
    setStockOperator,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    advancedFilter,
    setAdvancedFilterState,
    baseExported,
    setBaseExported,
    filtersCollapsedByDefault,
  } = useProductListFiltersContext();
  const { preferences, setAdvancedFilterPresets } = useUserPreferences();
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const advancedFilterPresets = preferences.advancedFilterPresets;
  const hasAdvancedFilter = advancedFilter.trim().length > 0;

  const selectedCatalogId =
    catalogFilter !== 'all' && catalogFilter !== 'unassigned' ? catalogFilter : undefined;
  const { data: categories = [] } = useProductCategories(selectedCatalogId);
  const { data: catalogs = [] } = useCatalogs();
  const { data: tags = [] } = useTags(selectedCatalogId);
  const catalogIds = useMemo(
    () => catalogs.map((catalog) => catalog.id).filter((id) => id.trim().length > 0),
    [catalogs]
  );
  const multiTagQueries = useMultiTags(selectedCatalogId ? [] : catalogIds);
  const { data: producers = [] } = useProducers();

  const categoryOptions = useMemo(() => {
    const options = [{ value: '__all__', label: 'All categories' }];
    categories.forEach((category: ProductCategory) => {
      const localizedName = category[nameLocale];
      const fallbackName =
        category.name_en || category.name || category.name_pl || category.name_de;
      options.push({
        value: category.id,
        label: localizedName || fallbackName || category.id,
      });
    });
    return options;
  }, [categories, nameLocale]);

  const fallbackTagOptions = useMemo(() => {
    if (selectedCatalogId) return tags;

    const unique = new Map<string, { id: string; name: string }>();
    multiTagQueries.forEach((query) => {
      const entries = query.data ?? [];
      entries.forEach((tag) => {
        if (!tag.id || unique.has(tag.id)) return;
        unique.set(tag.id, {
          id: tag.id,
          name: tag.name || tag.id,
        });
      });
    });
    return Array.from(unique.values());
  }, [multiTagQueries, selectedCatalogId, tags]);

  const advancedFieldValueOptions = useMemo<
    Partial<Record<ProductAdvancedFilterField, Array<{ value: string; label: string }>>>
  >(
    () => ({
      catalogId: catalogs.map((catalog) => ({
        value: catalog.id,
        label: catalog.name || catalog.id,
      })),
      tagId: fallbackTagOptions.map((tag) => ({
        value: tag.id,
        label: tag.name || tag.id,
      })),
      producerId: producers.map((producer) => ({
        value: producer.id,
        label: producer.name || producer.id,
      })),
    }),
    [catalogs, fallbackTagOptions, producers]
  );

  // Filter configuration
  const filterConfig: FilterField[] = useMemo(
    () => [
      {
        key: 'productId',
        label: 'Product ID',
        type: 'text',
        placeholder: 'Search by product ID...',
        width: '16rem',
      },
      {
        key: 'idMatchMode',
        label: 'ID Match',
        type: 'select',
        placeholder: 'Choose match mode',
        options: [
          { value: 'exact', label: 'Exact' },
          { value: 'partial', label: 'Partial' },
        ],
        width: '10rem',
      },
      { key: 'sku', label: 'SKU', type: 'text', placeholder: 'Search by SKU...', width: '14rem' },
      {
        key: 'description',
        label: 'Description',
        type: 'text',
        placeholder: 'Search by description...',
        width: '16rem',
      },
      {
        key: 'categoryId',
        label: 'Category',
        type: 'select',
        placeholder: 'All categories',
        options: categoryOptions,
        width: '16rem',
      },
      {
        key: 'baseExported',
        label: 'Base.com Export',
        type: 'select',
        placeholder: 'All export statuses',
        options: [
          { value: '__all__', label: 'All export statuses' },
          { value: 'true', label: 'Exported to Base.com' },
          { value: 'false', label: 'Not exported to Base.com' },
        ],
        width: '16rem',
      },
      {
        key: 'minPrice',
        label: 'Min Price',
        type: 'number',
        placeholder: 'Min price',
        width: '9rem',
      },
      {
        key: 'maxPrice',
        label: 'Max Price',
        type: 'number',
        placeholder: 'Max price',
        width: '9rem',
      },
      {
        key: 'stockOperator',
        label: 'Stock Operator',
        type: 'select',
        placeholder: 'Choose operator',
        options: [
          { value: '__all__', label: 'Any' },
          { value: 'gt', label: 'More than (>)' },
          { value: 'gte', label: 'More than or equal (>=)' },
          { value: 'lt', label: 'Less than (<)' },
          { value: 'lte', label: 'Less than or equal (<=)' },
          { value: 'eq', label: 'Equal (=)' },
        ],
        width: '13rem',
      },
      {
        key: 'stockValue',
        label: 'Stock Value',
        type: 'number',
        placeholder: 'Stock amount',
        width: '10rem',
      },
      { key: 'createdAt', label: 'Date Range', type: 'dateRange', width: '22rem' },
    ],
    [categoryOptions]
  );

  // Filter values (combined date range into single object)
  const filterValues = useMemo(
    () => ({
      productId,
      idMatchMode: productId.trim() ? idMatchMode : '',
      sku,
      description,
      categoryId,
      baseExported,
      minPrice,
      maxPrice,
      stockOperator,
      stockValue,
      createdAt: { from: startDate, to: endDate },
    }),
    [
      productId,
      idMatchMode,
      sku,
      description,
      categoryId,
      baseExported,
      minPrice,
      maxPrice,
      stockOperator,
      stockValue,
      startDate,
      endDate,
    ]
  );

  // Handle filter changes
  const handleFilterChange = (key: string, value: unknown) => {
    switch (key) {
      case 'productId':
        setProductId(typeof value === 'string' ? value : '');
        break;
      case 'idMatchMode':
        setIdMatchMode(value === 'partial' ? 'partial' : 'exact');
        break;
      case 'sku':
        setSku(typeof value === 'string' ? value : '');
        break;
      case 'description':
        setDescription(typeof value === 'string' ? value : '');
        break;
      case 'categoryId':
        setCategoryId(typeof value === 'string' && value && value !== '__all__' ? value : '');
        break;
      case 'baseExported':
        if (value === 'true' || value === 'false') {
          setBaseExported(value);
        } else {
          setBaseExported('');
        }
        break;
      case 'minPrice':
        setMinPrice(
          value === '' || value === null || value === undefined ? undefined : Number(value)
        );
        break;
      case 'maxPrice':
        setMaxPrice(
          value === '' || value === null || value === undefined ? undefined : Number(value)
        );
        break;
      case 'stockOperator':
        if (
          value === 'gt' ||
          value === 'gte' ||
          value === 'lt' ||
          value === 'lte' ||
          value === 'eq'
        ) {
          setStockOperator(value);
        } else {
          setStockOperator('');
        }
        break;
      case 'stockValue':
        setStockValue(
          value === '' || value === null || value === undefined ? undefined : Number(value)
        );
        break;
      case 'createdAt': {
        const dateRange = value as { from?: string; to?: string } | undefined;
        setStartDate(dateRange?.from || '');
        setEndDate(dateRange?.to || '');
        break;
      }
    }
  };

  const handleSavePresetFromModal = useCallback(
    async (name: string, filter: ProductAdvancedFilterGroup): Promise<void> => {
      const trimmedName = normalizePresetName(name);
      if (!trimmedName) {
        throw new Error('Preset name is required.');
      }
      if (hasPresetNameConflict(advancedFilterPresets, trimmedName)) {
        throw new Error('Preset name already exists. Choose a unique name.');
      }
      const preset = createAdvancedPreset(trimmedName, filter);
      await setAdvancedFilterPresets([...advancedFilterPresets, preset]);
    },
    [advancedFilterPresets, setAdvancedFilterPresets]
  );

  return (
    <>
      <FilterPanel
        filters={filterConfig}
        values={filterValues}
        search={search}
        searchPlaceholder='Search by product name...'
        onFilterChange={handleFilterChange}
        onSearchChange={setSearch}
        onReset={() => {
          setSearch('');
          setProductId('');
          setIdMatchMode('exact');
          setSku('');
          setDescription('');
          setCategoryId('');
          setBaseExported('');
          setMinPrice(undefined);
          setMaxPrice(undefined);
          setStockOperator('');
          setStockValue(undefined);
          setStartDate('');
          setEndDate('');
          setAdvancedFilterState('', null);
        }}
        actions={
          <Button
            type='button'
            size='sm'
            variant={hasAdvancedFilter ? 'default' : 'outline'}
            onClick={() => setIsAdvancedFilterOpen(true)}
            className='h-8'
          >
            Advanced Filter
          </Button>
        }
        collapsible
        defaultExpanded={!filtersCollapsedByDefault}
        showHeader={false}
      />

      {isAdvancedFilterOpen ? (
        <AdvancedFilterModal
          open={isAdvancedFilterOpen}
          value={advancedFilter}
          onClose={() => setIsAdvancedFilterOpen(false)}
          onApply={(value) => setAdvancedFilterState(value, null)}
          onClear={() => setAdvancedFilterState('', null)}
          onSavePreset={handleSavePresetFromModal}
          fieldValueOptions={advancedFieldValueOptions}
        />
      ) : null}
    </>
  );
});

ProductFilters.displayName = 'ProductFilters';
