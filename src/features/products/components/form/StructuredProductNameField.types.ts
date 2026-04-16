import type { ProductTitleTermType } from '@/shared/contracts/products/title-terms';
import type { StructuredProductTitleLocale } from '@/shared/lib/products/title-terms';

export type TitleSegmentStage = 1 | 2 | 3 | 4;

export type SuggestionOption = {
  value: string;
  label: string;
  aliases: string[];
  searchText: string;
  description?: string;
  disabled?: boolean;
  categoryId?: string;
};

export type SegmentBounds = {
  start: number;
  end: number;
};

export type SegmentContextUpdate = {
  activeStage: TitleSegmentStage | null;
  bounds: SegmentBounds | null;
  query: string;
};

export type StructuredProductNameFieldConfig = {
  locale?: StructuredProductTitleLocale;
  label?: string;
  description?: string;
  placeholder?: string;
};

export type StructuredProductNameFieldProps = {
  fieldName?: 'name_en' | 'name_pl';
  config?: StructuredProductNameFieldConfig;
};

export const TITLE_SEGMENT_LABELS: Record<TitleSegmentStage, string> = {
  1: 'Size',
  2: 'Material',
  3: 'Category',
  4: 'Theme',
};

export const CATEGORY_STAGE = 3 satisfies ProductTitleTermType | number;
