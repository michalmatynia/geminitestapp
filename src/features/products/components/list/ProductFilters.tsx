'use client';
'use no memo';

import React, { useEffect, useState } from 'react';

import { AdvancedFilterModal } from '@/features/products/components/list/advanced-filter';
import { useProductListFiltersContext } from '@/features/products/context/ProductListContext';
import {
  useProductCategories,
  useProductCategoriesForCatalogs,
} from '@/features/products/hooks/useCategoryQueries';
import {
  useCatalogs,
  useFilterTags,
  useProducers,
} from '@/features/products/hooks/useProductMetadataQueries';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductAdvancedFilterField, ProductAdvancedFilterGroup } from '@/shared/contracts/products/filters';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductTag } from '@/shared/contracts/products/tags';

const ID_MATCH_MODE_OPTIONS: Array<LabeledOptionDto<'exact' | 'partial'>> = [
  { value: 'exact', label: 'Exact' },
  { value: 'partial', label: 'Partial' },
];

const BASE_EXPORTED_OPTIONS: Array<LabeledOptionDto<'__all__' | 'true' | 'false'>> = [
  { value: '__all__', label: 'All export statuses' },
  { value: 'true', label: 'Exported to Base.com' },
  { value: 'false', label: 'Not exported to Base.com' },
];

const STOCK_OPERATOR_OPTIONS: Array<
  LabeledOptionDto<'__all__' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq'>
> = [
  { value: '__all__', label: 'Any' },
  { value: 'gt', label: 'More than (>)' },
  { value: 'gte', label: 'More than or equal (>=)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (<=)' },
  { value: 'eq', label: 'Equal (=)' },
];
import { Button } from '@/shared/ui/button';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';

import type { FilterField } from '@/shared/contracts/ui/panels';

import {
  createAdvancedPreset,
  hasPresetNameConflict,
  normalizePresetName,
} from './product-filters-utils';

export { ProductSelectionActions } from './ProductSelectionActions';

const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const isCatalogRecord = (value: unknown): value is CatalogRecord =>
  Boolean(value) &&
  typeof value === 'object' &&
  normalizeString((value as { id?: unknown }).id).length > 0;

const isProductCategory = (value: unknown): value is ProductCategory =>
  Boolean(value) &&
  typeof value === 'object' &&
  normalizeString((value as { id?: unknown }).id).length > 0;

const isProductTag = (value: unknown): value is ProductTag =>
  Boolean(value) &&
  typeof value === 'object' &&
  normalizeString((value as { id?: unknown }).id).length > 0;

const isProducer = (value: unknown): value is Producer =>
  Boolean(value) &&
  typeof value === 'object' &&
  normalizeString((value as { id?: unknown }).id).length > 0;

type ProductFiltersProps = {
  instanceId?: string;
};

export function ProductFilters({
  instanceId,
}: ProductFiltersProps): React.JSX.Element {
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
    advancedFilterPresets,
    setAdvancedFilterPresets,
    setAdvancedFilterState,
    baseExported,
    setBaseExported,
    includeArchived,
    setIncludeArchived,
    filtersCollapsedByDefault,
  } = useProductListFiltersContext();
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(!filtersCollapsedByDefault);
  const hasAdvancedFilter = advancedFilter.trim().length > 0;
  const filterMetadataEnabled = isFilterPanelExpanded || isAdvancedFilterOpen;

  useEffect(() => {
    setIsFilterPanelExpanded(!filtersCollapsedByDefault);
  }, [filtersCollapsedByDefault]);

  const selectedCatalogId =
    catalogFilter !== 'all' && catalogFilter !== 'unassigned' ? catalogFilter : undefined;
  const { data: rawCatalogs } = useCatalogs({ enabled: filterMetadataEnabled });
  const catalogs = Array.isArray(rawCatalogs) ? rawCatalogs.filter(isCatalogRecord) : [];
  const catalogIds = catalogs
    .map((catalog) => normalizeString(catalog.id))
    .filter((id) => id.length > 0);
  const { data: rawSingleCatalogCategories } = useProductCategories(selectedCatalogId, {
    enabled: isFilterPanelExpanded,
  });
  const { data: rawCrossCatalogCategories } = useProductCategoriesForCatalogs(
    selectedCatalogId || catalogFilter === 'unassigned' ? [] : catalogIds,
    {
      enabled: isFilterPanelExpanded,
    }
  );
  const { data: rawAvailableTags } = useFilterTags(selectedCatalogId, {
    enabled: filterMetadataEnabled,
  });
  const categorySource = selectedCatalogId ? rawSingleCatalogCategories : rawCrossCatalogCategories;
  const categories = Array.isArray(categorySource) ? categorySource.filter(isProductCategory) : [];
  const availableTags = Array.isArray(rawAvailableTags)
    ? rawAvailableTags.filter(isProductTag)
    : [];
  const catalogNameById = new Map(
    catalogs.map(
      (catalog) =>
        [
          normalizeString(catalog.id),
          normalizeString(catalog.name) || normalizeString(catalog.id),
        ] as const
    )
  );
  const { data: rawProducers } = useProducers({ enabled: filterMetadataEnabled });
  const producers = Array.isArray(rawProducers) ? rawProducers.filter(isProducer) : [];

  const categoryOptions: Array<LabeledOptionDto<string>> = [
    { value: '__all__', label: 'All categories' },
  ];
  const categoryEntries = categories.map((category: ProductCategory) => {
    const localizedName = normalizeString(category[nameLocale]);
    const fallbackName =
      normalizeString(category.name_en) ||
      normalizeString(category.name) ||
      normalizeString(category.name_pl) ||
      normalizeString(category.name_de);
    return {
      category,
      label: localizedName || fallbackName || normalizeString(category.id) || 'Unlabeled category',
    };
  });
  const duplicateCountByLabel = new Map<string, number>();

  categoryEntries.forEach(({ label }) => {
    duplicateCountByLabel.set(label, (duplicateCountByLabel.get(label) ?? 0) + 1);
  });

  categoryEntries
    .sort((left, right) => {
      const labelComparison = left.label.localeCompare(right.label);
      if (labelComparison !== 0) return labelComparison;

      const leftCatalog =
        normalizeString(catalogNameById.get(left.category.catalogId)) ||
        normalizeString(left.category.catalogId) ||
        'Unknown catalog';
      const rightCatalog =
        normalizeString(catalogNameById.get(right.category.catalogId)) ||
        normalizeString(right.category.catalogId) ||
        'Unknown catalog';
      return leftCatalog.localeCompare(rightCatalog);
    })
    .forEach(({ category, label }) => {
      const catalogLabel =
        normalizeString(catalogNameById.get(category.catalogId)) ||
        normalizeString(category.catalogId) ||
        'Unknown catalog';
      const isDuplicateLabel = (duplicateCountByLabel.get(label) ?? 0) > 1;

      categoryOptions.push({
        value: normalizeString(category.id),
        label: !selectedCatalogId && isDuplicateLabel ? `${label} (${catalogLabel})` : label,
      });
    });

  const fallbackTagOptionMap = new Map<string, { id: string; name: string }>();
  availableTags.forEach((tag) => {
    const tagId = normalizeString(tag.id);
    if (!tagId || fallbackTagOptionMap.has(tagId)) return;
    fallbackTagOptionMap.set(tagId, {
      id: tagId,
      name: normalizeString(tag.name) || tagId,
    });
  });
  const fallbackTagOptions = Array.from(fallbackTagOptionMap.values());

  const advancedFieldValueOptions: Partial<
    Record<ProductAdvancedFilterField, Array<LabeledOptionDto<string>>>
  > = {
    catalogId: catalogs.map((catalog) => ({
      value: normalizeString(catalog.id),
      label: normalizeString(catalog.name) || normalizeString(catalog.id),
    })),
    tagId: fallbackTagOptions.map((tag) => ({
      value: normalizeString(tag.id),
      label: normalizeString(tag.name) || normalizeString(tag.id),
    })),
    producerId: producers.map((producer) => ({
      value: normalizeString(producer.id),
      label: normalizeString(producer.name) || normalizeString(producer.id),
    })),
  };

  // Filter configuration
  const filterConfig: FilterField[] = [
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
      options: ID_MATCH_MODE_OPTIONS,
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
      options: BASE_EXPORTED_OPTIONS,
      width: '16rem',
    },
    {
      key: 'includeArchived',
      label: 'Show Archived',
      type: 'checkbox',
      width: '12rem',
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
      options: STOCK_OPERATOR_OPTIONS,
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
  ];

  // Filter values (combined date range into single object)
  const filterValues = {
    productId,
    idMatchMode: normalizeString(productId) ? idMatchMode : '',
    sku,
    description,
    categoryId,
    baseExported,
    includeArchived,
    minPrice,
    maxPrice,
    stockOperator,
    stockValue,
    createdAt: { from: startDate, to: endDate },
  };

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
      case 'includeArchived':
        setIncludeArchived(value === true);
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

  const handleSavePresetFromModal = async (
    name: string,
    filter: ProductAdvancedFilterGroup
  ): Promise<void> => {
    const trimmedName = normalizePresetName(name);
    if (!trimmedName) {
      throw new Error('Preset name is required.');
    }
    if (hasPresetNameConflict(advancedFilterPresets, trimmedName)) {
      throw new Error('Preset name already exists. Choose a unique name.');
    }
    const preset = createAdvancedPreset(trimmedName, filter);
    await setAdvancedFilterPresets([...advancedFilterPresets, preset]);
  };

  return (
    <>
      <FilterPanel
        {...(instanceId ? { idBase: `products-${instanceId}` } : {})}
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
          setIncludeArchived(false);
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
            className='h-8 w-full sm:w-auto'
          >
            Advanced Filter
          </Button>
        }
        collapsible
        defaultExpanded={!filtersCollapsedByDefault}
        onExpandedChange={setIsFilterPanelExpanded}
        toggleButtonAlignment='start'
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
}

ProductFilters.displayName = 'ProductFilters';
