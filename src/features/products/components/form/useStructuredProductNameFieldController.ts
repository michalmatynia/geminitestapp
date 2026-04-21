import { useId, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductTitleTerm } from '@/shared/contracts/products/title-terms';

import type { SuggestionOption, StructuredProductNameFieldConfig, StructuredProductNameFieldProps } from './StructuredProductNameField.types';
import { useStructuredProductCategorySync } from './useStructuredProductCategorySync';
import { useStructuredProductNameSuggestions } from './useStructuredProductNameSuggestions';

type FieldConfig = Required<StructuredProductNameFieldConfig>;

export type StructuredProductNameFieldController = {
  fieldName: 'name_en' | 'name_pl';
  inputName: string;
  inputRef: (node: HTMLInputElement | null) => void;
  value: string;
  label: string;
  description: string;
  placeholder: string;
  error?: string;
  titleTermsHref: string;
  primaryCatalogId?: string;
  selectedCategoryLabel: string | null;
  dropdownOpen: boolean;
  listboxId: string;
  activeDescendantId?: string;
  listboxLabel: string;
  suggestions: SuggestionOption[];
  highlightedIndex: number;
  onApplySuggestion: (option: SuggestionOption) => void;
  onHighlightSuggestion: (index: number) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onClick: (event: React.MouseEvent<HTMLInputElement>) => void;
  onKeyUp: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
};

const resolveFieldConfig = (
  fieldName: 'name_en' | 'name_pl',
  config: StructuredProductNameFieldConfig
): FieldConfig => {
  const locale = config.locale ?? 'en';
  const defaultPlaceholder =
    locale === 'pl'
      ? 'Scout Regiment | 4 cm | Metal | Przypinka Anime | Attack On Titan'
      : 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan';
  return {
    locale,
    label: config.label ?? (fieldName === 'name_pl' ? 'Polish Name' : 'English Name'),
    description:
      config.description ??
      'REQUIRED FORMAT: <name> | <size> | <material> | <category> | <lore or theme>',
    placeholder: config.placeholder ?? defaultPlaceholder,
  };
};

const resolveTitleTermsHref = (primaryCatalogId: string | undefined): string => {
  const normalizedCatalogId = typeof primaryCatalogId === 'string' ? primaryCatalogId.trim() : '';
  if (normalizedCatalogId === '') return '/admin/products/title-terms';
  return `/admin/products/title-terms?catalogId=${encodeURIComponent(normalizedCatalogId)}`;
};

const toTitleTerms = (data: ProductTitleTerm[] | undefined): ProductTitleTerm[] => data ?? [];

 
export function useStructuredProductNameFieldController({
  fieldName = 'name_en',
  config = {},
}: StructuredProductNameFieldProps = {}): StructuredProductNameFieldController {
  const resolvedConfig = resolveFieldConfig(fieldName, config);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();
  const { control, getValues, setValue } = useFormContext<ProductFormData>();
  const { field } = useController<ProductFormData>({ control, name: fieldName, defaultValue: '' });
  const { errors, normalizeNameError, setNormalizeNameError } = useProductFormCore();
  const metadata = useProductFormMetadata() as Partial<ReturnType<typeof useProductFormMetadata>>;
  const primaryCatalogId = metadata.selectedCatalogIds?.[0];
  const selectedCategoryId = metadata.selectedCategoryId ?? null;
  const setCategoryId = metadata.setCategoryId ?? ((): void => {});
  const nameValue = typeof field.value === 'string' ? field.value : '';
  const sizeTermsQuery = useTitleTerms(primaryCatalogId, 'size');
  const materialTermsQuery = useTitleTerms(primaryCatalogId, 'material');
  const themeTermsQuery = useTitleTerms(primaryCatalogId, 'theme');
  const categorySync = useStructuredProductCategorySync({
    categories: metadata.categories ?? [],
    fieldName,
    locale: resolvedConfig.locale,
    nameValue,
    selectedCategoryId,
    setCategoryId,
    getValues,
    setValue,
  });
  const error =
    fieldName === 'name_en' ? (normalizeNameError ?? errors[fieldName]?.message) : errors[fieldName]?.message;
  const onFieldChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (fieldName === 'name_en' && normalizeNameError !== null && normalizeNameError !== '') {
      setNormalizeNameError(null);
    }
    field.onChange(event);
  };
  const suggestionController = useStructuredProductNameSuggestions({
    categorySuggestions: categorySync.categorySuggestions,
    fieldName,
    inputRef,
    listboxId,
    locale: resolvedConfig.locale,
    materialTerms: toTitleTerms(materialTermsQuery.data),
    nameValue,
    primaryCatalogId,
    setCategoryId,
    setNormalizeNameError,
    setValue,
    sizeTerms: toTitleTerms(sizeTermsQuery.data),
    syncMappedCategoryField: categorySync.syncMappedCategoryField,
    themeTerms: toTitleTerms(themeTermsQuery.data),
    onFieldBlur: field.onBlur,
    onFieldChange,
  });

  return {
    fieldName,
    inputName: field.name,
    inputRef: (node) => {
      inputRef.current = node;
      if (node !== null) field.ref(node);
    },
    value: nameValue,
    label: resolvedConfig.label,
    description: resolvedConfig.description,
    placeholder: resolvedConfig.placeholder,
    error: typeof error === 'string' ? error : undefined,
    titleTermsHref: resolveTitleTermsHref(primaryCatalogId),
    primaryCatalogId,
    selectedCategoryLabel: categorySync.selectedCategoryOption?.label ?? null,
    listboxId,
    ...suggestionController,
  };
}
