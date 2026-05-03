'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  arraysEqual,
  CATALOG_ID_KEY_SEPARATOR,
  createCatalogIdsKey,
  normalizeCatalogIdList,
  normalizeCategoryId,
  normalizeSelectionIds,
  resolveCategoryIdFromProduct,
  toTrimmedString,
} from './useProductMetadata.helpers';
import type {
  ProductMetadataInitialSelections,
  ProductMetadataSelectionState,
  UseProductMetadataProps,
} from './useProductMetadata.types';

const resolveProductCatalogSelection = (
  product: UseProductMetadataProps['product']
): string[] => {
  if (product === undefined) return [];
  const productCatalogs = Array.isArray(product.catalogs) ? product.catalogs : [];
  const productCatalogIds = normalizeCatalogIdList(productCatalogs);
  if (productCatalogIds.length > 0) return productCatalogIds;
  const fallbackCatalogId = toTrimmedString(product.catalogId);
  return fallbackCatalogId.length > 0 ? [fallbackCatalogId] : [];
};

const resolveInitialCatalogIdsFromKey = (initialCatalogIdsKey: string): string[] =>
  initialCatalogIdsKey.length === 0
    ? []
    : initialCatalogIdsKey
        .split(CATALOG_ID_KEY_SEPARATOR)
        .filter((catalogId: string): boolean => catalogId.length > 0);

const resolveCatalogSelection = ({
  initialCatalogId,
  initialCatalogIdsKey,
  product,
}: Pick<UseProductMetadataProps, 'initialCatalogId' | 'product'> & {
  initialCatalogIdsKey: string;
}): string[] => {
  const productCatalogIds = resolveProductCatalogSelection(product);
  if (productCatalogIds.length > 0) return productCatalogIds;
  const initialCatalogIds = resolveInitialCatalogIdsFromKey(initialCatalogIdsKey);
  if (initialCatalogIds.length > 0) return initialCatalogIds;
  const fallbackInitialCatalogId = toTrimmedString(initialCatalogId);
  return fallbackInitialCatalogId.length > 0 ? [fallbackInitialCatalogId] : [];
};

const resolveCategorySelection = ({
  initialCategoryId,
  product,
}: Pick<UseProductMetadataProps, 'initialCategoryId' | 'product'>): string | null => {
  const productCategoryId = resolveCategoryIdFromProduct(product);
  if (productCategoryId !== null) return productCategoryId;
  return initialCategoryId !== undefined ? normalizeCategoryId(initialCategoryId) : null;
};

const resolveTagSelection = ({
  initialTagIds,
  product,
}: Pick<UseProductMetadataProps, 'initialTagIds' | 'product'>): string[] =>
  product !== undefined && Array.isArray(product.tags)
    ? product.tags.map((tag: { tagId: string }): string => tag.tagId)
    : initialTagIds ?? [];

const resolveProducerSelection = ({
  initialProducerIds,
  product,
}: Pick<UseProductMetadataProps, 'initialProducerIds' | 'product'>): string[] =>
  product !== undefined && Array.isArray(product.producers)
    ? normalizeSelectionIds(
        product.producers.map((producer: { producerId: string }): string => producer.producerId)
      )
    : normalizeSelectionIds(initialProducerIds ?? []);

const useSyncedStringArrayState = (
  nextValue: string[]
): [string[], React.Dispatch<React.SetStateAction<string[]>>] => {
  const [value, setValue] = useState<string[]>(nextValue);
  useEffect(() => {
    setValue((prev: string[]) => (arraysEqual(prev, nextValue) ? prev : nextValue));
  }, [nextValue]);
  return [value, setValue];
};

const useSyncedNullableStringState = (
  nextValue: string | null
): [string | null, React.Dispatch<React.SetStateAction<string | null>>] => {
  const [value, setValue] = useState<string | null>(nextValue);
  useEffect(() => {
    setValue((prev: string | null) => (prev === nextValue ? prev : nextValue));
  }, [nextValue]);
  return [value, setValue];
};

export const useProductMetadataInitialSelections = ({
  initialCatalogId,
  initialCatalogIds,
  initialCategoryId,
  initialProducerIds,
  initialTagIds,
  product,
}: UseProductMetadataProps): ProductMetadataInitialSelections => {
  const initialCatalogIdsKey = useMemo(
    (): string => createCatalogIdsKey(initialCatalogIds),
    [initialCatalogIds]
  );
  const catalogIds = useMemo(
    (): string[] => resolveCatalogSelection({ initialCatalogId, initialCatalogIdsKey, product }),
    [initialCatalogId, initialCatalogIdsKey, product]
  );
  const categoryId = useMemo(
    (): string | null => resolveCategorySelection({ initialCategoryId, product }),
    [initialCategoryId, product]
  );
  const tagIds = useMemo(
    (): string[] => resolveTagSelection({ initialTagIds, product }),
    [initialTagIds, product]
  );
  const producerIds = useMemo(
    (): string[] => resolveProducerSelection({ initialProducerIds, product }),
    [initialProducerIds, product]
  );
  return { catalogIds, categoryId, producerIds, tagIds };
};

export const useProductMetadataSelectionState = ({
  catalogIds,
  categoryId,
  producerIds,
  tagIds,
}: ProductMetadataInitialSelections): ProductMetadataSelectionState => {
  const [selectedCatalogIds, setSelectedCatalogIds] = useSyncedStringArrayState(catalogIds);
  const [selectedCategoryId, setSelectedCategoryId] = useSyncedNullableStringState(categoryId);
  const [selectedTagIds, setSelectedTagIds] = useSyncedStringArrayState(tagIds);
  const [selectedProducerIds, setSelectedProducerIds] = useSyncedStringArrayState(producerIds);
  const toggleCatalog = (catalogId: string): void => {
    setSelectedCatalogIds((prev: string[]) =>
      prev.includes(catalogId) ? prev.filter((id: string) => id !== catalogId) : [...prev, catalogId]
    );
  };
  const setCategoryId = (nextCategoryId: string | null): void => {
    setSelectedCategoryId(normalizeCategoryId(nextCategoryId));
  };
  const toggleTag = (tagId: string): void => {
    setSelectedTagIds((prev: string[]) =>
      prev.includes(tagId) ? prev.filter((id: string) => id !== tagId) : [...prev, tagId]
    );
  };
  const toggleProducer = (producerId: string): void => {
    setSelectedProducerIds((prev: string[]) =>
      prev.includes(producerId)
        ? prev.filter((id: string) => id !== producerId)
        : [...prev, producerId]
    );
  };
  const setProducerIds = (nextProducerIds: string[]): void => {
    setSelectedProducerIds((prev: string[]) => {
      const nextIds = normalizeSelectionIds(nextProducerIds);
      return arraysEqual(prev, nextIds) ? prev : nextIds;
    });
  };

  return { selectedCatalogIds, selectedCategoryId, selectedProducerIds, selectedTagIds,
    setCategoryId, setProducerIds, toggleCatalog, toggleProducer, toggleTag };
};
