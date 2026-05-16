import type { LabeledOptionDto } from '@/shared/contracts/base';
import { type ProductDraftKind, type ProductDraftOpenFormTab } from '@/shared/contracts/products';

export const DEFAULT_ICON_COLOR = '#60a5fa';
export const ANY_SCRAPE_PROFILE_VALUE = '__any_scrape_profile__';

export const DRAFT_KIND_SELECT_OPTIONS: Array<LabeledOptionDto<ProductDraftKind>> = [
  { value: 'standard', label: 'Standard' },
  { value: 'scrape_template', label: 'Scrape Template' },
];

export const OPEN_PRODUCT_FORM_TAB_SELECT_OPTIONS: Array<LabeledOptionDto<ProductDraftOpenFormTab>> = [
  { value: 'general', label: 'Details' },
  { value: 'parameters', label: 'Parameters' },
  { value: 'marketplace-copy', label: 'Marketplace Copy' },
];

export const ICON_COLOR_MODE_OPTIONS: Array<LabeledOptionDto<'theme' | 'custom'>> = [
  { value: 'theme', label: 'Theme Color' },
  { value: 'custom', label: 'Custom Color' },
];

export const PRODUCT_IDENTIFIER_OPTIONS: Array<LabeledOptionDto<'ean' | 'gtin' | 'asin'>> = [
  { value: 'ean', label: 'EAN' },
  { value: 'gtin', label: 'GTIN' },
  { value: 'asin', label: 'ASIN' },
];
