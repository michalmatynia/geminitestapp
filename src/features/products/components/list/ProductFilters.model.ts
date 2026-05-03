import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductAdvancedFilterField, ProductAdvancedFilterGroup } from '@/shared/contracts/products/filters';
import type { ProductListFiltersContextType } from '@/features/products/context/ProductListContext';
import type { FilterField } from '@/shared/contracts/ui/panels';
import { PRODUCT_CATEGORY_FILTER_ALL_VALUE } from '@/shared/lib/products/constants';

import {
  createAdvancedPreset,
  hasPresetNameConflict,
  normalizePresetName,
} from './product-filters-utils';

export const ID_MATCH_MODE_OPTIONS: Array<LabeledOptionDto<'exact' | 'partial'>> = [
  { value: 'exact', label: 'Exact' },
  { value: 'partial', label: 'Partial' },
];

export const BASE_EXPORTED_OPTIONS: Array<LabeledOptionDto<'__all__' | 'true' | 'false'>> = [
  { value: '__all__', label: 'All export statuses' },
  { value: 'true', label: 'Exported to Base.com' },
  { value: 'false', label: 'Not exported to Base.com' },
];

export const TRADERA_STATUS_OPTIONS: Array<LabeledOptionDto<string>> = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'not_added', label: 'Not added' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'ended', label: 'Ended' },
  { value: 'sold', label: 'Sold' },
  { value: 'unsold', label: 'Unsold' },
  { value: 'queued', label: 'Queued' },
  { value: 'queued_relist', label: 'Queued relist' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'listed', label: 'Listed' },
  { value: 'failed', label: 'Failed' },
  { value: 'auth_required', label: 'Auth required' },
  { value: 'needs_login', label: 'Needs login' },
  { value: 'error', label: 'Error' },
  { value: 'removed', label: 'Removed' },
  { value: 'archived', label: 'Archived' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const STOCK_OPERATOR_OPTIONS: Array<
  LabeledOptionDto<'__all__' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq'>
> = [
  { value: '__all__', label: 'Any' },
  { value: 'gt', label: 'More than (>)' },
  { value: 'gte', label: 'More than or equal (>=)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (<=)' },
  { value: 'eq', label: 'Equal (=)' },
];

type ProductFiltersValueInput = Pick<
  ProductListFiltersContextType,
  | 'productId'
  | 'idMatchMode'
  | 'sku'
  | 'description'
  | 'categoryId'
  | 'baseExported'
  | 'includeArchived'
  | 'minPrice'
  | 'maxPrice'
  | 'stockOperator'
  | 'stockValue'
  | 'startDate'
  | 'endDate'
>;

type ProductFiltersSetterInput = Pick<
  ProductListFiltersContextType,
  | 'setSearch'
  | 'setProductId'
  | 'setIdMatchMode'
  | 'setSku'
  | 'setDescription'
  | 'setCategoryId'
  | 'setBaseExported'
  | 'setIncludeArchived'
  | 'setMinPrice'
  | 'setMaxPrice'
  | 'setStockOperator'
  | 'setStockValue'
  | 'setStartDate'
  | 'setEndDate'
  | 'setAdvancedFilterState'
>;

type ProductFiltersPresetInput = Pick<
  ProductListFiltersContextType,
  'advancedFilterPresets' | 'setAdvancedFilterPresets'
>;

const STOCK_OPERATOR_VALUES = new Set(['gt', 'gte', 'lt', 'lte', 'eq']);

export const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const toFormString = (value: unknown): string => (typeof value === 'string' ? value : '');

const toOptionalNumber = (value: unknown): number | undefined =>
  value === '' || value === null || value === undefined ? undefined : Number(value);

const isStockOperator = (
  value: unknown
): value is ProductListFiltersContextType['stockOperator'] =>
  typeof value === 'string' && STOCK_OPERATOR_VALUES.has(value);

const resolveCategoryFilterValue = (value: unknown): string => {
  const nextValue = toFormString(value);
  if (nextValue.length === 0 || nextValue === PRODUCT_CATEGORY_FILTER_ALL_VALUE) return '';
  return nextValue;
};

const resolveDateRangeValue = (value: unknown): { from: string; to: string } => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return { from: '', to: '' };
  }
  const record = value as { from?: unknown; to?: unknown };
  return {
    from: toFormString(record.from),
    to: toFormString(record.to),
  };
};

const PRODUCT_TEXT_FILTER_FIELDS: FilterField[] = [
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
];

const PRODUCT_STATUS_FILTER_FIELDS: FilterField[] = [
  {
    key: 'baseExported',
    label: 'Base.com Export',
    type: 'select',
    placeholder: 'All export statuses',
    options: BASE_EXPORTED_OPTIONS,
    width: '16rem',
  },
  { key: 'includeArchived', label: 'Show Archived', type: 'checkbox', width: '12rem' },
];

const PRODUCT_NUMERIC_FILTER_FIELDS: FilterField[] = [
  { key: 'minPrice', label: 'Min Price', type: 'number', placeholder: 'Min price', width: '9rem' },
  { key: 'maxPrice', label: 'Max Price', type: 'number', placeholder: 'Max price', width: '9rem' },
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

export const buildProductFilterConfig = (
  categoryOptions: Array<LabeledOptionDto<string>>
): FilterField[] => [
  ...PRODUCT_TEXT_FILTER_FIELDS,
  {
    key: 'categoryId',
    label: 'Category',
    type: 'select',
    placeholder: 'All categories',
    options: categoryOptions,
    width: '16rem',
  },
  ...PRODUCT_STATUS_FILTER_FIELDS,
  ...PRODUCT_NUMERIC_FILTER_FIELDS,
];

export const buildProductFilterValues = (filters: ProductFiltersValueInput): Record<string, unknown> => ({
  productId: filters.productId,
  idMatchMode: normalizeString(filters.productId).length > 0 ? filters.idMatchMode : '',
  sku: filters.sku,
  description: filters.description,
  categoryId: filters.categoryId,
  baseExported: filters.baseExported,
  includeArchived: filters.includeArchived,
  minPrice: filters.minPrice,
  maxPrice: filters.maxPrice,
  stockOperator: filters.stockOperator,
  stockValue: filters.stockValue,
  createdAt: { from: filters.startDate, to: filters.endDate },
});

const createProductFilterHandlers = (
  filters: ProductFiltersSetterInput
): Record<string, (value: unknown) => void> => ({
  productId: (value) => filters.setProductId(toFormString(value)),
  idMatchMode: (value) => filters.setIdMatchMode(value === 'partial' ? 'partial' : 'exact'),
  sku: (value) => filters.setSku(toFormString(value)),
  description: (value) => filters.setDescription(toFormString(value)),
  categoryId: (value) => filters.setCategoryId(resolveCategoryFilterValue(value)),
  baseExported: (value) => filters.setBaseExported(value === 'true' || value === 'false' ? value : ''),
  includeArchived: (value) => filters.setIncludeArchived(value === true),
  minPrice: (value) => filters.setMinPrice(toOptionalNumber(value)),
  maxPrice: (value) => filters.setMaxPrice(toOptionalNumber(value)),
  stockOperator: (value) => filters.setStockOperator(isStockOperator(value) ? value : ''),
  stockValue: (value) => filters.setStockValue(toOptionalNumber(value)),
  createdAt: (value) => {
    const dateRange = resolveDateRangeValue(value);
    filters.setStartDate(dateRange.from);
    filters.setEndDate(dateRange.to);
  },
});

export const createProductFilterChangeHandler =
  (filters: ProductFiltersSetterInput): ((key: string, value: unknown) => void) =>
  (key, value): void => {
    const handler = createProductFilterHandlers(filters)[key];
    if (handler !== undefined) handler(value);
  };

export const createProductFiltersResetHandler =
  (filters: ProductFiltersSetterInput): (() => void) =>
  (): void => {
    filters.setSearch('');
    filters.setProductId('');
    filters.setIdMatchMode('exact');
    filters.setSku('');
    filters.setDescription('');
    filters.setCategoryId('');
    filters.setBaseExported('');
    filters.setIncludeArchived(false);
    filters.setMinPrice(undefined);
    filters.setMaxPrice(undefined);
    filters.setStockOperator('');
    filters.setStockValue(undefined);
    filters.setStartDate('');
    filters.setEndDate('');
    filters.setAdvancedFilterState('', null);
  };

export const createProductFilterPresetSaveHandler =
  (filters: ProductFiltersPresetInput) =>
  async (name: string, filter: ProductAdvancedFilterGroup): Promise<void> => {
    const trimmedName = normalizePresetName(name);
    if (trimmedName.length === 0) {
      throw new Error('Preset name is required.');
    }
    if (hasPresetNameConflict(filters.advancedFilterPresets, trimmedName)) {
      throw new Error('Preset name already exists. Choose a unique name.');
    }
    const preset = createAdvancedPreset(trimmedName, filter);
    await filters.setAdvancedFilterPresets([...filters.advancedFilterPresets, preset]);
  };

export type AdvancedFieldValueOptions = Partial<
  Record<ProductAdvancedFilterField, Array<LabeledOptionDto<string>>>
>;
