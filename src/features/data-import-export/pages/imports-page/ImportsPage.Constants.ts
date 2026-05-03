import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { BaseImportMode } from '@/shared/contracts/integrations/base-com';

export const BASE_CONNECTION_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Select a connection...',
};

export const NO_TEMPLATE_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'No template',
};

export const LIMIT_OPTIONS = [
  { value: '1', label: '1' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: 'all', label: 'All' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'1' | '5' | '10' | '50' | '100' | 'all'>>;

export const IMAGE_MODE_OPTIONS = [
  { value: 'links', label: 'Import image links' },
  { value: 'download', label: 'Download product images' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'links' | 'download'>>;

export const IMPORT_MODE_OPTIONS = [
  { value: 'upsert_on_base_id', label: 'Upsert by Base ID' },
  { value: 'upsert_on_sku', label: 'Upsert by SKU' },
  { value: 'create_only', label: 'Create only' },
] as const satisfies ReadonlyArray<
  LabeledOptionDto<'create_only' | 'upsert_on_base_id' | 'upsert_on_sku'>
>;

export const isImageMode = (value: string): value is 'links' | 'download' =>
  IMAGE_MODE_OPTIONS.some((option) => option.value === value);

export const isImportMode = (value: string): value is BaseImportMode =>
  IMPORT_MODE_OPTIONS.some((option) => option.value === value);

export const IMPORT_LIST_MODE_OPTIONS: Array<LabeledOptionDto<'all' | 'unique'>> = [
  { value: 'all', label: 'All products' },
  { value: 'unique', label: 'Unique only' },
];

export const IMPORT_LIST_PAGE_SIZE_OPTIONS: Array<LabeledOptionDto<string>> = [
  { value: '10', label: '10 / page' },
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
];

export const EXPORT_WAREHOUSE_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Skip stock export',
};
