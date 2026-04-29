import { useId, useRef } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import {
  useController,
  useFormContext,
  type UseFormGetValues,
  type UseFormSetValue,
} from 'react-hook-form';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductTitleTerm } from '@/shared/contracts/products/title-terms';

import type { SuggestionOption, StructuredProductNameFieldConfig, StructuredProductNameFieldProps } from './StructuredProductNameField.types';
import { useStructuredProductCategorySync } from './useStructuredProductCategorySync';
import { useStructuredProductNameSuggestions } from './useStructuredProductNameSuggestions';

type FieldConfig = Required<StructuredProductNameFieldConfig>;
type StructuredProductNameMetadata = {
  categories: ProductCategory[];
  primaryCatalogId: string | undefined;
  selectedCategoryId: string | null;
  setCategoryId: (categoryId: string | null) => void;
};

type StructuredProductTitleTerms = {
  sizeTerms: ProductTitleTerm[];
  materialTerms: ProductTitleTerm[];
  themeTerms: ProductTitleTerm[];
};

type StructuredNameCategoryController = StructuredProductNameMetadata & {
  categorySuggestions: SuggestionOption[];
  selectedCategoryLabel: string | null;
  syncMappedCategoryField: (nextCategoryId: string | null) => void;
};

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

const useStructuredProductNameMetadata = (): StructuredProductNameMetadata => {
  const metadata = useProductFormMetadata() as Partial<ReturnType<typeof useProductFormMetadata>>;
  return {
    categories: metadata.categories ?? [],
    primaryCatalogId: metadata.selectedCatalogIds?.[0],
    selectedCategoryId: metadata.selectedCategoryId ?? null,
    setCategoryId: metadata.setCategoryId ?? ((): void => {}),
  };
};

const useStructuredProductTitleTerms = (
  primaryCatalogId: string | undefined
): StructuredProductTitleTerms => {
  const sizeTermsQuery = useTitleTerms(primaryCatalogId, 'size');
  const materialTermsQuery = useTitleTerms(primaryCatalogId, 'material');
  const themeTermsQuery = useTitleTerms(primaryCatalogId, 'theme');
  return {
    sizeTerms: toTitleTerms(sizeTermsQuery.data),
    materialTerms: toTitleTerms(materialTermsQuery.data),
    themeTerms: toTitleTerms(themeTermsQuery.data),
  };
};

const useStructuredNameCategoryController = ({
  fieldName,
  locale,
  nameValue,
  getValues,
  setValue,
}: {
  fieldName: 'name_en' | 'name_pl';
  locale: FieldConfig['locale'];
  nameValue: string;
  getValues: UseFormGetValues<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
}): StructuredNameCategoryController => {
  const metadata = useStructuredProductNameMetadata();
  const categorySync = useStructuredProductCategorySync({
    categories: metadata.categories,
    fieldName,
    locale,
    nameValue,
    selectedCategoryId: metadata.selectedCategoryId,
    setCategoryId: metadata.setCategoryId,
    getValues,
    setValue,
  });
  return {
    ...metadata,
    categorySuggestions: categorySync.categorySuggestions,
    selectedCategoryLabel: categorySync.selectedCategoryOption?.label ?? null,
    syncMappedCategoryField: categorySync.syncMappedCategoryField,
  };
};

const resolveStructuredNameError = ({
  fieldName,
  normalizeNameError,
  fieldError,
}: {
  fieldName: 'name_en' | 'name_pl';
  normalizeNameError: string | null;
  fieldError: unknown;
}): string | undefined => {
  if (fieldName === 'name_en' && normalizeNameError !== null) return normalizeNameError;
  return typeof fieldError === 'string' ? fieldError : undefined;
};

const assignStructuredNameInputRef = ({
  inputRef,
  fieldRef,
  node,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  fieldRef: (instance: HTMLInputElement | null) => void;
  node: HTMLInputElement | null;
}): void => {
  const targetRef = inputRef;
  targetRef.current = node;
  if (node !== null) fieldRef(node);
};

type UseStructuredNameSuggestionsControllerArgs = {
  categorySuggestions: SuggestionOption[];
  fieldName: 'name_en' | 'name_pl';
  inputRef: RefObject<HTMLInputElement | null>;
  listboxId: string;
  locale: FieldConfig['locale'];
  nameValue: string;
  primaryCatalogId: string | undefined;
  setCategoryId: (categoryId: string | null) => void;
  setNormalizeNameError: (error: string | null) => void;
  setValue: UseFormSetValue<ProductFormData>;
  syncMappedCategoryField: (nextCategoryId: string | null) => void;
  onFieldBlur: () => void;
  onFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const useStructuredNameSuggestionsController = ({
  categorySuggestions,
  fieldName,
  inputRef,
  listboxId,
  locale,
  nameValue,
  primaryCatalogId,
  setCategoryId,
  setNormalizeNameError,
  setValue,
  syncMappedCategoryField,
  onFieldBlur,
  onFieldChange,
}: UseStructuredNameSuggestionsControllerArgs): ReturnType<
  typeof useStructuredProductNameSuggestions
> => {
  const { sizeTerms, materialTerms, themeTerms } = useStructuredProductTitleTerms(primaryCatalogId);
  return useStructuredProductNameSuggestions({
    categorySuggestions,
    fieldName,
    inputRef,
    listboxId,
    locale,
    materialTerms,
    nameValue,
    primaryCatalogId,
    setCategoryId,
    setNormalizeNameError,
    setValue,
    sizeTerms,
    syncMappedCategoryField,
    themeTerms,
    onFieldBlur,
    onFieldChange,
  });
};

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
  const nameValue = typeof field.value === 'string' ? field.value : '';
  const categoryController = useStructuredNameCategoryController({
    fieldName,
    locale: resolvedConfig.locale,
    nameValue,
    getValues,
    setValue,
  });
  const error = resolveStructuredNameError({
    fieldName,
    normalizeNameError,
    fieldError: errors[fieldName]?.message,
  });
  const onFieldChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (fieldName === 'name_en' && normalizeNameError !== null && normalizeNameError !== '') {
      setNormalizeNameError(null);
    }
    field.onChange(event);
  };
  const suggestionController = useStructuredNameSuggestionsController({
    categorySuggestions: categoryController.categorySuggestions,
    fieldName,
    inputRef,
    listboxId,
    locale: resolvedConfig.locale,
    nameValue,
    primaryCatalogId: categoryController.primaryCatalogId,
    setCategoryId: categoryController.setCategoryId,
    setNormalizeNameError,
    setValue,
    syncMappedCategoryField: categoryController.syncMappedCategoryField,
    onFieldBlur: field.onBlur,
    onFieldChange,
  });

  return {
    fieldName,
    inputName: field.name,
    inputRef: (node) => assignStructuredNameInputRef({ inputRef, fieldRef: field.ref, node }),
    value: nameValue,
    label: resolvedConfig.label,
    description: resolvedConfig.description,
    placeholder: resolvedConfig.placeholder,
    error,
    titleTermsHref: resolveTitleTermsHref(categoryController.primaryCatalogId),
    primaryCatalogId: categoryController.primaryCatalogId,
    selectedCategoryLabel: categoryController.selectedCategoryLabel,
    listboxId,
    ...suggestionController,
  };
}
