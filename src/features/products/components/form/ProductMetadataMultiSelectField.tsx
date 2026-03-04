'use client';

import { useContext, useMemo } from 'react';

import { ProductFormMetadataContext } from '@/features/products/context/ProductFormMetadataContext';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { MultiSelect } from '@/shared/ui';

import { useOptionalProductMetadataFieldContext } from './ProductMetadataFieldContext';

type MetadataItem = {
  id: string;
  name: string;
  parentId?: string | null;
  sortIndex?: number | null;
};

const ROOT_PARENT_KEY = '__root__';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }
  return null;
};

const compareCategoryItems = (a: MetadataItem, b: MetadataItem): number => {
  const aSort = toNumberOrNull(a.sortIndex);
  const bSort = toNumberOrNull(b.sortIndex);
  if (aSort !== null || bSort !== null) {
    if (aSort === null) return 1;
    if (bSort === null) return -1;
    if (aSort !== bSort) return aSort - bSort;
  }

  const aName = toTrimmedString(a.name).toLowerCase();
  const bName = toTrimmedString(b.name).toLowerCase();
  if (aName < bName) return -1;
  if (aName > bName) return 1;

  const aId = toTrimmedString(a.id);
  const bId = toTrimmedString(b.id);
  return aId.localeCompare(bId);
};

const buildCategoryTreeOptions = (
  rawItems: MetadataItem[]
): Array<{ value: string; label: string }> => {
  const normalizedItems: MetadataItem[] = [];
  const byId = new Map<string, MetadataItem>();

  rawItems.forEach((rawItem: MetadataItem): void => {
    const id = toTrimmedString(rawItem.id);
    if (!id) return;
    const name = toTrimmedString(rawItem.name) || id;
    const parentId = toTrimmedString(rawItem.parentId);
    const normalizedItem: MetadataItem = {
      ...rawItem,
      id,
      name,
      parentId: parentId || null,
      sortIndex: toNumberOrNull(rawItem.sortIndex),
    };
    normalizedItems.push(normalizedItem);
    byId.set(id, normalizedItem);
  });

  const childrenByParent = new Map<string, MetadataItem[]>();
  const appendChild = (parentKey: string, child: MetadataItem): void => {
    const existing = childrenByParent.get(parentKey);
    if (existing) {
      existing.push(child);
      return;
    }
    childrenByParent.set(parentKey, [child]);
  };

  normalizedItems.forEach((item: MetadataItem): void => {
    const parentId = toTrimmedString(item.parentId);
    const hasValidParent = parentId.length > 0 && parentId !== item.id && byId.has(parentId);
    appendChild(hasValidParent ? parentId : ROOT_PARENT_KEY, item);
  });

  childrenByParent.forEach((items: MetadataItem[]): void => {
    items.sort(compareCategoryItems);
  });

  const options: Array<{ value: string; label: string }> = [];
  const visited = new Set<string>();

  const visit = (item: MetadataItem, level: number): void => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    const levelPrefix = level > 0 ? `${'|-- '.repeat(level)}` : '';
    options.push({
      value: item.id,
      label: `${levelPrefix}${item.name}`,
    });

    const children = childrenByParent.get(item.id) ?? [];
    children.forEach((child: MetadataItem): void => {
      visit(child, level + 1);
    });
  };

  (childrenByParent.get(ROOT_PARENT_KEY) ?? []).forEach((rootItem: MetadataItem): void => {
    visit(rootItem, 0);
  });

  normalizedItems
    .slice()
    .sort(compareCategoryItems)
    .forEach((item: MetadataItem): void => {
      visit(item, 0);
    });

  return options;
};

export interface ProductMetadataMultiSelectFieldProps {
  label: string;
  items?: MetadataItem[] | undefined;
  selectedIds?: string[] | undefined;
  onChange?: ((nextIds: string[]) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
  searchPlaceholder?: string | undefined;
  emptyMessage?: string | undefined;

  // Mapping keys for context retrieval
  contextItemsKey: 'catalogs' | 'producers' | 'tags' | 'categories';
  contextSelectedKey:
    | 'selectedCatalogIds'
    | 'selectedProducerIds'
    | 'selectedTagIds'
    | 'selectedCategoryId';
  contextLoadingKey: 'catalogsLoading' | 'producersLoading' | 'tagsLoading' | 'categoriesLoading';
  contextOnChangeKey:
    | 'onCatalogsChange'
    | 'onProducersChange'
    | 'onTagsChange'
    | 'onCategoryChange';

  // Form context toggle helper name
  formContextToggleName?: 'toggleCatalog' | 'toggleProducer' | 'toggleTag';

  single?: boolean;
}

type ProductMetadataMultiSelectRuntimeValue = {
  label: string;
  options: Array<{ value: string; label: string }>;
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  loading: boolean;
  disabled: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage?: string | undefined;
  single: boolean;
};

const {
  Context: ProductMetadataMultiSelectRuntimeContext,
  useStrictContext: useProductMetadataMultiSelectRuntime,
} = createStrictContext<ProductMetadataMultiSelectRuntimeValue>({
  hookName: 'useProductMetadataMultiSelectRuntime',
  providerName: 'ProductMetadataMultiSelectRuntimeProvider',
  displayName: 'ProductMetadataMultiSelectRuntimeContext',
});

function ProductMetadataMultiSelectRuntime(): React.JSX.Element {
  const {
    label,
    options,
    selectedIds,
    onChange,
    loading,
    disabled,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    single,
  } = useProductMetadataMultiSelectRuntime();
  return (
    <MultiSelect
      label={label}
      options={options}
      selected={selectedIds}
      onChange={onChange}
      loading={loading}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      single={single}
    />
  );
}

/**
 * Generic field for product metadata selection (Catalogs, Producers, Tags).
 * Consolidates CatalogMultiSelectField, ProducerMultiSelectField, TagMultiSelectField.
 */
export function ProductMetadataMultiSelectField({
  label,
  items: itemsProp,
  selectedIds: selectedIdsProp,
  onChange: onChangeProp,
  loading = false,
  disabled = false,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  contextItemsKey,
  contextSelectedKey,
  contextLoadingKey,
  contextOnChangeKey,
  formContextToggleName,
  single = false,
}: ProductMetadataMultiSelectFieldProps): React.JSX.Element {
  const formMetadataContext = useContext(ProductFormMetadataContext);
  const metadataContext = useOptionalProductMetadataFieldContext();

  const contextItems = (() => {
    if (!formMetadataContext) return [];
    switch (contextItemsKey) {
      case 'catalogs':
        return formMetadataContext.catalogs;
      case 'producers':
        return formMetadataContext.producers;
      case 'tags':
        return formMetadataContext.tags;
      case 'categories':
        return formMetadataContext.categories;
      default:
        return [];
    }
  })();

  const items =
    itemsProp ??
    (metadataContext?.[contextItemsKey] as MetadataItem[]) ??
    (contextItems as MetadataItem[]);

  // Handle both single string/null and string[]
  const contextSelected = (() => {
    if (!formMetadataContext) return null;
    switch (contextSelectedKey) {
      case 'selectedCatalogIds':
        return formMetadataContext.selectedCatalogIds;
      case 'selectedProducerIds':
        return formMetadataContext.selectedProducerIds;
      case 'selectedTagIds':
        return formMetadataContext.selectedTagIds;
      case 'selectedCategoryId':
        return formMetadataContext.selectedCategoryId;
      default:
        return null;
    }
  })();

  const rawSelected =
    selectedIdsProp ??
    (metadataContext?.[contextSelectedKey] as string[] | string | null) ??
    contextSelected;

  const selectedIds = Array.isArray(rawSelected) ? rawSelected : rawSelected ? [rawSelected] : [];

  const contextLoading = (() => {
    if (!formMetadataContext) return loading;
    switch (contextLoadingKey) {
      case 'catalogsLoading':
        return formMetadataContext.catalogsLoading;
      case 'producersLoading':
        return formMetadataContext.producersLoading;
      case 'tagsLoading':
        return formMetadataContext.tagsLoading;
      case 'categoriesLoading':
        return formMetadataContext.categoriesLoading;
      default:
        return loading;
    }
  })();

  const resolvedLoading = itemsProp
    ? loading
    : ((metadataContext?.[contextLoadingKey] as boolean) ?? contextLoading);

  const resolveSingleChangeHandler = (): ((id: string | null) => void) | null => {
    const metadataHandler = metadataContext?.[contextOnChangeKey];
    if (typeof metadataHandler === 'function') {
      return metadataHandler as (id: string | null) => void;
    }

    if (contextOnChangeKey === 'onCategoryChange' && formMetadataContext?.setCategoryId) {
      return formMetadataContext.setCategoryId;
    }

    return null;
  };

  const resolveFormContextMultiHandler = (): ((nextIds: string[]) => void) | null => {
    if (!formMetadataContext || !formContextToggleName) return null;

    const toggleById = (() => {
      switch (formContextToggleName) {
        case 'toggleCatalog':
          return formMetadataContext.toggleCatalog;
        case 'toggleProducer':
          return formMetadataContext.toggleProducer;
        case 'toggleTag':
          return formMetadataContext.toggleTag;
        default:
          return null;
      }
    })();
    if (!toggleById) return null;

    const currentSelection = (() => {
      switch (contextSelectedKey) {
        case 'selectedCatalogIds':
          return formMetadataContext.selectedCatalogIds;
        case 'selectedProducerIds':
          return formMetadataContext.selectedProducerIds;
        case 'selectedTagIds':
          return formMetadataContext.selectedTagIds;
        default:
          return [];
      }
    })();

    return (nextIds: string[]): void => {
      const previous = new Set(currentSelection);
      const next = new Set(nextIds);

      for (const id of nextIds) {
        if (!previous.has(id)) {
          toggleById(id);
        }
      }

      for (const id of currentSelection) {
        if (!next.has(id)) {
          toggleById(id);
        }
      }
    };
  };

  const resolvedOnChange: ((nextIds: string[]) => void) | null = onChangeProp
    ? onChangeProp
    : single
      ? (() => {
        const singleHandler = resolveSingleChangeHandler();
        if (!singleHandler) return null;
        return (nextIds: string[]): void => {
          singleHandler(nextIds[0] || null);
        };
      })()
      : ((metadataContext?.[contextOnChangeKey] as (nextIds: string[]) => void) ??
        resolveFormContextMultiHandler());

  if (!resolvedOnChange) {
    throw internalError(
      `${label} field requires 'onChange' prop when used outside ProductFormMetadataContext or ProductMetadataFieldContext.`
    );
  }

  const options = (() => {
    if (contextItemsKey === 'categories') {
      return buildCategoryTreeOptions(items);
    }
    return items.map((item) => ({
      value: item.id,
      label: item.name,
    }));
  })();
  const resolvedPlaceholder = placeholder || `Select ${label.toLowerCase()}`;
  const resolvedSearchPlaceholder = searchPlaceholder || `Search ${label.toLowerCase()}...`;
  const runtimeValue = useMemo(
    () => ({
      label,
      options,
      selectedIds,
      onChange: resolvedOnChange,
      loading: resolvedLoading,
      disabled,
      placeholder: resolvedPlaceholder,
      searchPlaceholder: resolvedSearchPlaceholder,
      emptyMessage,
      single,
    }),
    [
      disabled,
      emptyMessage,
      label,
      options,
      resolvedLoading,
      resolvedOnChange,
      resolvedPlaceholder,
      resolvedSearchPlaceholder,
      selectedIds,
      single,
    ]
  );

  return (
    <ProductMetadataMultiSelectRuntimeContext.Provider value={runtimeValue}>
      <ProductMetadataMultiSelectRuntime />
    </ProductMetadataMultiSelectRuntimeContext.Provider>
  );
}
