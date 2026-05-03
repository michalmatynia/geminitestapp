'use client';

import { useContext, useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  ProductFormMetadataContext,
  type ProductFormMetadataContextType,
} from '@/features/products/context/ProductFormMetadataContext';
import { internalError } from '@/shared/errors/app-error';

import {
  useOptionalProductMetadataFieldActionsContext,
  useOptionalProductMetadataFieldStateContext,
  type ProductMetadataFieldActionsContextValue,
  type ProductMetadataFieldStateContextValue,
} from './ProductMetadataFieldContext';
import {
  buildCategoryTreeOptions,
  buildFlatMetadataOptions,
} from './ProductMetadataMultiSelectField.options';
import type {
  MetadataItem,
  ProductMetadataMultiSelectFieldProps,
  ProductMetadataMultiSelectFieldResolvedProps,
} from './ProductMetadataMultiSelectField.types';

type SingleChangeHandler = (id: string | null) => void;
type MultiChangeHandler = (nextIds: string[]) => void;

const resolveContextItems = (
  context: ProductFormMetadataContextType | null,
  key: ProductMetadataMultiSelectFieldProps['contextItemsKey']
): MetadataItem[] => {
  if (context === null) return [];
  if (key === 'catalogs') return context.catalogs;
  if (key === 'producers') return context.producers;
  if (key === 'tags') return context.tags;
  return context.categories;
};

const resolveContextSelected = (
  context: ProductFormMetadataContextType | null,
  key: ProductMetadataMultiSelectFieldProps['contextSelectedKey']
): string[] | string | null => {
  if (context === null) return null;
  if (key === 'selectedCatalogIds') return context.selectedCatalogIds;
  if (key === 'selectedProducerIds') return context.selectedProducerIds;
  if (key === 'selectedTagIds') return context.selectedTagIds;
  return context.selectedCategoryId;
};

const resolveSelectedIds = (value: string[] | string | null | undefined): string[] => {
  if (Array.isArray(value)) return value;
  return typeof value === 'string' && value.length > 0 ? [value] : [];
};

const resolveContextLoading = (
  context: ProductFormMetadataContextType | null,
  key: ProductMetadataMultiSelectFieldProps['contextLoadingKey'],
  fallback: boolean
): boolean => {
  if (context === null) return fallback;
  if (key === 'catalogsLoading') return context.catalogsLoading;
  if (key === 'producersLoading') return context.producersLoading;
  if (key === 'tagsLoading') return context.tagsLoading;
  return context.categoriesLoading;
};

const resolveSingleChangeHandler = (
  actionsContext: ProductMetadataFieldActionsContextValue | null,
  formContext: ProductFormMetadataContextType | null,
  key: ProductMetadataMultiSelectFieldProps['contextOnChangeKey']
): SingleChangeHandler | null => {
  const metadataHandler = actionsContext?.[key];
  if (typeof metadataHandler === 'function') return metadataHandler as SingleChangeHandler;
  if (key === 'onCategoryChange') return formContext?.setCategoryId ?? null;
  return null;
};

const resolveFormToggle = (
  formContext: ProductFormMetadataContextType,
  toggleName: ProductMetadataMultiSelectFieldProps['formContextToggleName']
): ((id: string) => void) | null => {
  if (toggleName === 'toggleCatalog') return formContext.toggleCatalog;
  if (toggleName === 'toggleProducer') return formContext.toggleProducer;
  if (toggleName === 'toggleTag') return formContext.toggleTag;
  return null;
};

const resolveCurrentFormSelection = (
  formContext: ProductFormMetadataContextType,
  key: ProductMetadataMultiSelectFieldProps['contextSelectedKey']
): string[] => {
  if (key === 'selectedCatalogIds') return formContext.selectedCatalogIds;
  if (key === 'selectedProducerIds') return formContext.selectedProducerIds;
  if (key === 'selectedTagIds') return formContext.selectedTagIds;
  return [];
};

const createToggleBasedChangeHandler = (
  currentSelection: string[],
  toggleById: (id: string) => void
): MultiChangeHandler => {
  const previous = new Set(currentSelection);
  return (nextIds: string[]): void => {
    const next = new Set(nextIds);
    for (const id of nextIds) {
      if (!previous.has(id)) toggleById(id);
    }
    for (const id of currentSelection) {
      if (!next.has(id)) toggleById(id);
    }
  };
};

const resolveFormContextMultiHandler = (
  formContext: ProductFormMetadataContextType | null,
  props: ProductMetadataMultiSelectFieldProps
): MultiChangeHandler | null => {
  if (formContext === null || props.formContextToggleName === undefined) return null;
  const toggleById = resolveFormToggle(formContext, props.formContextToggleName);
  if (toggleById === null) return null;
  return createToggleBasedChangeHandler(
    resolveCurrentFormSelection(formContext, props.contextSelectedKey),
    toggleById
  );
};

const resolveContextMultiHandler = (
  actionsContext: ProductMetadataFieldActionsContextValue | null,
  key: ProductMetadataMultiSelectFieldProps['contextOnChangeKey']
): MultiChangeHandler | null => {
  const handler = actionsContext?.[key];
  return typeof handler === 'function' ? (handler as MultiChangeHandler) : null;
};

const createSingleMultiSelectHandler = (handler: SingleChangeHandler): MultiChangeHandler => (
  nextIds
): void => {
  handler(nextIds[0] ?? null);
};

const resolveOnChange = (args: {
  props: ProductMetadataMultiSelectFieldProps;
  formContext: ProductFormMetadataContextType | null;
  actionsContext: ProductMetadataFieldActionsContextValue | null;
}): MultiChangeHandler | null => {
  if (args.props.onChange !== undefined) return args.props.onChange;
  if (args.props.single === true) {
    const singleHandler = resolveSingleChangeHandler(
      args.actionsContext,
      args.formContext,
      args.props.contextOnChangeKey
    );
    return singleHandler === null ? null : createSingleMultiSelectHandler(singleHandler);
  }
  return (
    resolveContextMultiHandler(args.actionsContext, args.props.contextOnChangeKey) ??
    resolveFormContextMultiHandler(args.formContext, args.props)
  );
};

const resolveItems = (
  props: ProductMetadataMultiSelectFieldProps,
  stateContext: ProductMetadataFieldStateContextValue | null,
  formContext: ProductFormMetadataContextType | null
): MetadataItem[] => {
  if (props.items !== undefined) return props.items;
  const stateItems = stateContext?.[props.contextItemsKey];
  if (Array.isArray(stateItems)) return stateItems;
  return resolveContextItems(formContext, props.contextItemsKey);
};

const resolveRawSelected = (
  props: ProductMetadataMultiSelectFieldProps,
  stateContext: ProductMetadataFieldStateContextValue | null,
  formContext: ProductFormMetadataContextType | null
): string[] | string | null | undefined =>
  props.selectedIds ??
  stateContext?.[props.contextSelectedKey] ??
  resolveContextSelected(formContext, props.contextSelectedKey);

const resolveFieldOptions = (
  items: MetadataItem[],
  key: ProductMetadataMultiSelectFieldProps['contextItemsKey']
): Array<LabeledOptionDto<string>> =>
  key === 'categories' ? buildCategoryTreeOptions(items) : buildFlatMetadataOptions(items);

const resolveFieldLoading = (
  props: ProductMetadataMultiSelectFieldProps,
  stateContext: ProductMetadataFieldStateContextValue | null,
  formContext: ProductFormMetadataContextType | null
): boolean => {
  if (props.items !== undefined) return props.loading ?? false;
  return (
    stateContext?.[props.contextLoadingKey] ??
    resolveContextLoading(formContext, props.contextLoadingKey, props.loading ?? false)
  );
};

export const useProductMetadataMultiSelectFieldProps = (
  props: ProductMetadataMultiSelectFieldProps
): ProductMetadataMultiSelectFieldResolvedProps => {
  const formContext = useContext(ProductFormMetadataContext);
  const stateContext = useOptionalProductMetadataFieldStateContext();
  const actionsContext = useOptionalProductMetadataFieldActionsContext();
  const items = resolveItems(props, stateContext, formContext);
  const rawSelected = resolveRawSelected(props, stateContext, formContext);
  const resolvedOnChange = resolveOnChange({ props, formContext, actionsContext });
  const options = useMemo(
    () => resolveFieldOptions(items, props.contextItemsKey),
    [items, props.contextItemsKey]
  );

  if (resolvedOnChange === null) {
    throw internalError(
      `${props.label} field requires 'onChange' prop when used outside ProductFormMetadataContext or ProductMetadataFieldContext.`
    );
  }

  return {
    label: props.label,
    options,
    selectedIds: resolveSelectedIds(rawSelected),
    resolvedOnChange,
    resolvedLoading: resolveFieldLoading(props, stateContext, formContext),
    disabled: props.disabled ?? false,
    resolvedPlaceholder: props.placeholder ?? `Select ${props.label.toLowerCase()}`,
    resolvedSearchPlaceholder:
      props.searchPlaceholder ?? `Search ${props.label.toLowerCase()}...`,
    emptyMessage: props.emptyMessage,
    single: props.single ?? false,
  };
};
