import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductListPreferences } from '@/shared/contracts/products/filters';

export const DEFAULT_PRODUCT_LIST_PREFERENCES: ProductListPreferences = {
  nameLocale: 'name_en',
  catalogFilter: 'all',
  currencyCode: 'PLN',
  pageSize: 50,
  thumbnailSource: 'file',
  filtersCollapsedByDefault: true,
  showTriggerRunFeedback: true,
  advancedFilterPresets: [],
  appliedAdvancedFilter: '',
  appliedAdvancedFilterPresetId: null,
};

export const NAME_LOCALE_OPTIONS = [
  { value: 'name_en', label: 'English' },
  { value: 'name_pl', label: 'Polish' },
  { value: 'name_de', label: 'German' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'name_en' | 'name_pl' | 'name_de'>>;

export const ALL_CATALOGS_OPTION: LabeledOptionDto<string> = {
  value: 'all',
  label: 'All Catalogs',
};

export const THUMBNAIL_SOURCE_OPTIONS = [
  { value: 'file', label: 'File Uploads' },
  { value: 'link', label: 'URL Links' },
  { value: 'base64', label: 'Base64' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'file' | 'link' | 'base64'>>;

export const PAGE_SIZE_OPTIONS = ['10', '25', '50', '100', '200'].map((size: string) => ({
  value: size,
  label: size,
})) as ReadonlyArray<LabeledOptionDto<string>>;

export const FILTER_VISIBILITY_OPTIONS = [
  { value: 'shown', label: 'Show Filters' },
  { value: 'hidden', label: 'Hide Filters' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'shown' | 'hidden'>>;

export const TRIGGER_RUN_FEEDBACK_OPTIONS = [
  { value: 'shown', label: 'Show Pills' },
  { value: 'hidden', label: 'Hide Pills' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'shown' | 'hidden'>>;
