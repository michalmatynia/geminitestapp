import React, { type Dispatch, type SetStateAction } from 'react';

import type { Catalog } from '@/shared/contracts/products/catalogs';

import type { CatalogFormState } from './useCatalogForm.types';
import { EMPTY_CATALOG_FORM } from './useCatalogForm.types';
import { arraysEqual, firstOrEmpty } from './useCatalogForm.utils';

type CatalogFormSetters = {
  setForm: Dispatch<SetStateAction<CatalogFormState>>;
  setSelectedLanguageIds: Dispatch<SetStateAction<string[]>>;
  setDefaultLanguageId: Dispatch<SetStateAction<string>>;
  setCatalogPriceGroupIds: Dispatch<SetStateAction<string[]>>;
  setCatalogDefaultPriceGroupId: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setLanguageQuery: Dispatch<SetStateAction<string>>;
};

type CatalogStateSnapshot = {
  form: CatalogFormState;
  languageIds: string[];
  defaultLanguageId: string;
  priceGroupIds: string[];
  defaultPriceGroupId: string;
};

type CatalogStateSyncArgs = CatalogFormSetters & {
  catalog: Catalog | null | undefined;
  defaultGroupId: string;
  canonicalizeLanguageId: (value: string) => string;
  canonicalizePriceGroupId: (value: string) => string;
  normalizePriceGroupIds: (values: string[]) => string[];
};

const createFormSnapshot = (catalog: Catalog): CatalogFormState => ({
  name: catalog.name,
  description: catalog.description ?? '',
  isDefault: catalog.isDefault,
});

const resolveLanguageIds = (
  catalog: Catalog,
  canonicalizeLanguageId: (value: string) => string
): string[] =>
  Array.from(new Set(catalog.languageIds.map((id) => canonicalizeLanguageId(id)))).filter(
    (id) => id.length > 0
  );

const resolveDefaultLanguageId = (
  catalog: Catalog,
  languageIds: string[],
  canonicalizeLanguageId: (value: string) => string
): string => {
  const defaultLanguageId = catalog.defaultLanguageId;
  const normalized = defaultLanguageId === null ? '' : canonicalizeLanguageId(defaultLanguageId);
  return languageIds.includes(normalized) ? normalized : firstOrEmpty(languageIds);
};

const resolvePriceGroupIds = (
  catalog: Catalog,
  normalizedDefaultGroupId: string,
  normalizePriceGroupIds: (values: string[]) => string[]
): string[] => {
  if (catalog.priceGroupIds.length > 0) return normalizePriceGroupIds(catalog.priceGroupIds);
  return normalizedDefaultGroupId.length > 0 ? [normalizedDefaultGroupId] : [];
};

const resolveDefaultPriceGroupId = ({
  catalog,
  priceGroupIds,
  normalizedDefaultGroupId,
  canonicalizePriceGroupId,
}: {
  catalog: Catalog;
  priceGroupIds: string[];
  normalizedDefaultGroupId: string;
  canonicalizePriceGroupId: (value: string) => string;
}): string => {
  const defaultPriceGroupId = catalog.defaultPriceGroupId;
  const normalized = defaultPriceGroupId === null ? '' : canonicalizePriceGroupId(defaultPriceGroupId);
  if (priceGroupIds.includes(normalized)) return normalized;
  const firstPriceGroupId = firstOrEmpty(priceGroupIds);
  return firstPriceGroupId.length > 0 ? firstPriceGroupId : normalizedDefaultGroupId;
};

const buildExistingCatalogSnapshot = (args: CatalogStateSyncArgs): CatalogStateSnapshot => {
  const catalog = args.catalog;
  if (catalog === null || catalog === undefined) {
    return buildNewCatalogSnapshot(args.canonicalizePriceGroupId(args.defaultGroupId));
  }

  const normalizedDefaultGroupId = args.canonicalizePriceGroupId(args.defaultGroupId);
  const languageIds = resolveLanguageIds(catalog, args.canonicalizeLanguageId);
  const priceGroupIds = resolvePriceGroupIds(
    catalog,
    normalizedDefaultGroupId,
    args.normalizePriceGroupIds
  );
  return {
    form: createFormSnapshot(catalog),
    languageIds,
    defaultLanguageId: resolveDefaultLanguageId(catalog, languageIds, args.canonicalizeLanguageId),
    priceGroupIds,
    defaultPriceGroupId: resolveDefaultPriceGroupId({
      catalog,
      priceGroupIds,
      normalizedDefaultGroupId,
      canonicalizePriceGroupId: args.canonicalizePriceGroupId,
    }),
  };
};

const buildNewCatalogSnapshot = (normalizedDefaultGroupId: string): CatalogStateSnapshot => ({
  form: EMPTY_CATALOG_FORM,
  languageIds: [],
  defaultLanguageId: '',
  priceGroupIds: normalizedDefaultGroupId.length > 0 ? [normalizedDefaultGroupId] : [],
  defaultPriceGroupId: normalizedDefaultGroupId,
});

const isSameForm = (left: CatalogFormState, right: CatalogFormState): boolean =>
  left.name === right.name &&
  left.description === right.description &&
  left.isDefault === right.isDefault;

const applyCatalogSnapshot = (
  snapshot: CatalogStateSnapshot,
  setters: CatalogFormSetters
): void => {
  setters.setForm((previous) => (isSameForm(previous, snapshot.form) ? previous : snapshot.form));
  setters.setSelectedLanguageIds((previous) =>
    arraysEqual(previous, snapshot.languageIds) ? previous : snapshot.languageIds
  );
  setters.setDefaultLanguageId((previous) =>
    previous === snapshot.defaultLanguageId ? previous : snapshot.defaultLanguageId
  );
  setters.setCatalogPriceGroupIds((previous) =>
    arraysEqual(previous, snapshot.priceGroupIds) ? previous : snapshot.priceGroupIds
  );
  setters.setCatalogDefaultPriceGroupId((previous) =>
    previous === snapshot.defaultPriceGroupId ? previous : snapshot.defaultPriceGroupId
  );
  setters.setError((previous) => (previous === null ? previous : null));
  setters.setLanguageQuery((previous) => (previous.length === 0 ? previous : ''));
};

export function useCatalogFormStateSync(args: CatalogStateSyncArgs): void {
  React.useEffect(() => {
    applyCatalogSnapshot(buildExistingCatalogSnapshot(args), args);
  }, [
    args,
    args.catalog,
    args.canonicalizeLanguageId,
    args.canonicalizePriceGroupId,
    args.defaultGroupId,
    args.normalizePriceGroupIds,
  ]);
}
