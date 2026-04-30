'use client';

import { useMemo } from 'react';

import { useProductCategories } from '@/features/products/hooks/useCategoryQueries';
import {
  useCatalogs,
  useFilterTags,
  useProducers,
  useTitleTerms,
} from '@/features/products/hooks/useProductMetadataQueries';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type { ProductTitleTerm } from '@/shared/contracts/products/title-terms';
import { PRODUCT_CATEGORY_FILTER_ALL_VALUE } from '@/shared/lib/products/constants';
import {
  DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID,
  resolveDefaultProductCategoryTreeCatalogId,
} from '@/shared/lib/products/default-category-tree';

import { buildCategoryFilterOptions } from './product-category-filter-options';
import {
  normalizeString,
  TRADERA_STATUS_OPTIONS,
  type AdvancedFieldValueOptions,
} from './ProductFilters.model';

type ProductFilterMetadataInput = {
  catalogFilter: string;
  enabled: boolean;
  nameLocale: 'name_en' | 'name_pl' | 'name_de';
};

type ProductFilterMetadata = {
  advancedFieldValueOptions: AdvancedFieldValueOptions;
  categoryOptions: Array<LabeledOptionDto<string>>;
};

const isRecordWithId = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  value !== undefined &&
  typeof value === 'object' &&
  Array.isArray(value) === false &&
  normalizeString((value as { id?: unknown }).id).length > 0;

const isCatalogRecord = (value: unknown): value is CatalogRecord => isRecordWithId(value);

const isProductCategory = (value: unknown): value is ProductCategory => isRecordWithId(value);

const isProductTag = (value: unknown): value is ProductTag => isRecordWithId(value);

const isProducer = (value: unknown): value is Producer => isRecordWithId(value);

const isProductTitleTerm = (value: unknown): value is ProductTitleTerm =>
  isRecordWithId(value) && normalizeString((value as { name_en?: unknown }).name_en).length > 0;

const filterRecords = <T,>(value: unknown, predicate: (entry: unknown) => entry is T): T[] =>
  Array.isArray(value) ? value.filter(predicate) : [];

const resolveSelectedCatalogId = (catalogFilter: string): string | undefined =>
  catalogFilter !== 'all' && catalogFilter !== 'unassigned' ? catalogFilter : undefined;

const resolveDisplayLabel = (name: unknown, fallback: unknown): string => {
  const label = normalizeString(name);
  return label.length > 0 ? label : normalizeString(fallback);
};

const buildTitleTermOptions = (
  terms: ProductTitleTerm[]
): Array<LabeledOptionDto<string>> => {
  const optionMap = new Map<string, LabeledOptionDto<string>>();
  terms.forEach((term) => {
    const value = normalizeString(term.name_en);
    if (value.length === 0 || optionMap.has(value)) return;
    optionMap.set(value, { value, label: value });
  });
  return Array.from(optionMap.values()).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, {
      sensitivity: 'base',
      numeric: true,
    })
  );
};

const buildFallbackTagOptions = (availableTags: ProductTag[]): Array<{ id: string; name: string }> => {
  const fallbackTagOptionMap = new Map<string, { id: string; name: string }>();
  availableTags.forEach((tag) => {
    const tagId = normalizeString(tag.id);
    if (tagId.length === 0 || fallbackTagOptionMap.has(tagId)) return;
    fallbackTagOptionMap.set(tagId, {
      id: tagId,
      name: resolveDisplayLabel(tag.name, tagId),
    });
  });
  return Array.from(fallbackTagOptionMap.values());
};

const buildCatalogNameMap = (catalogs: CatalogRecord[]): Map<string, string> =>
  new Map(
    catalogs.map((catalog) => [
      normalizeString(catalog.id),
      resolveDisplayLabel(catalog.name, catalog.id),
    ])
  );

const buildAdvancedFieldValueOptions = ({
  catalogs,
  fallbackTagOptions,
  categoryOptions,
  producers,
  sizeTerms,
  materialTerms,
  themeTerms,
}: {
  catalogs: CatalogRecord[];
  fallbackTagOptions: Array<{ id: string; name: string }>;
  categoryOptions: Array<LabeledOptionDto<string>>;
  producers: Producer[];
  sizeTerms: ProductTitleTerm[];
  materialTerms: ProductTitleTerm[];
  themeTerms: ProductTitleTerm[];
}): AdvancedFieldValueOptions => ({
  catalogId: catalogs.map((catalog) => ({
    value: normalizeString(catalog.id),
    label: resolveDisplayLabel(catalog.name, catalog.id),
  })),
  tagId: fallbackTagOptions.map((tag) => ({
    value: normalizeString(tag.id),
    label: resolveDisplayLabel(tag.name, tag.id),
  })),
  categoryId: categoryOptions.filter(
    (option) => option.value !== PRODUCT_CATEGORY_FILTER_ALL_VALUE
  ),
  traderaStatus: TRADERA_STATUS_OPTIONS,
  producerId: producers.map((producer) => ({
    value: normalizeString(producer.id),
    label: resolveDisplayLabel(producer.name, producer.id),
  })),
  titleSize: buildTitleTermOptions(sizeTerms),
  titleMaterial: buildTitleTermOptions(materialTerms),
  titleTheme: buildTitleTermOptions(themeTerms),
});

export const useProductFilterMetadata = ({
  catalogFilter,
  enabled,
  nameLocale,
}: ProductFilterMetadataInput): ProductFilterMetadata => {
  const selectedCatalogId = resolveSelectedCatalogId(catalogFilter);
  const { data: rawCatalogs, isLoading: catalogsLoading } = useCatalogs({ enabled });
  const catalogs = filterRecords(rawCatalogs, isCatalogRecord);
  const categoryTreeCatalogId =
    resolveDefaultProductCategoryTreeCatalogId(catalogs) ??
    (catalogsLoading === true ? null : DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID);
  const { data: rawCategories } = useProductCategories(categoryTreeCatalogId ?? undefined, {
    enabled: enabled && categoryTreeCatalogId !== null,
  });
  const { data: rawAvailableTags } = useFilterTags(selectedCatalogId, { enabled });
  const titleTermQueryOptions = { enabled, allowWithoutCatalog: true } as const;
  const { data: rawSizeTerms } = useTitleTerms(selectedCatalogId, 'size', titleTermQueryOptions);
  const { data: rawMaterialTerms } = useTitleTerms(selectedCatalogId, 'material', titleTermQueryOptions);
  const { data: rawThemeTerms } = useTitleTerms(selectedCatalogId, 'theme', titleTermQueryOptions);
  const { data: rawProducers } = useProducers({ enabled });
  const categories = filterRecords(rawCategories, isProductCategory);
  const availableTags = filterRecords(rawAvailableTags, isProductTag);
  const producers = filterRecords(rawProducers, isProducer);
  const sizeTerms = filterRecords(rawSizeTerms, isProductTitleTerm);
  const materialTerms = filterRecords(rawMaterialTerms, isProductTitleTerm);
  const themeTerms = filterRecords(rawThemeTerms, isProductTitleTerm);

  return useMemo(() => {
    const categoryOptions = buildCategoryFilterOptions({
      categories,
      catalogNameById: buildCatalogNameMap(catalogs),
      nameLocale,
      selectedCatalogId: categoryTreeCatalogId ?? undefined,
    });
    const fallbackTagOptions = buildFallbackTagOptions(availableTags);
    return {
      categoryOptions,
      advancedFieldValueOptions: buildAdvancedFieldValueOptions({
        catalogs,
        fallbackTagOptions,
        categoryOptions,
        producers,
        sizeTerms,
        materialTerms,
        themeTerms,
      }),
    };
  }, [availableTags, catalogs, categories, categoryTreeCatalogId, materialTerms, nameLocale, producers, sizeTerms, themeTerms]);
};
