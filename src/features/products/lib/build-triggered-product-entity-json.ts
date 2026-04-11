import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { normalizeProductTriggerStatus } from './build-triggered-product-entity-json.helpers';

const normalizeTriggerCatalogIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry: unknown) => {
    const normalized =
      typeof entry === 'string'
        ? entry.trim()
        : entry && typeof entry === 'object'
          ? (typeof (entry as { catalogId?: unknown }).catalogId === 'string'
              ? (entry as { catalogId: string }).catalogId.trim()
              : typeof (entry as { id?: unknown }).id === 'string'
                ? (entry as { id: string }).id.trim()
                : '')
          : '';
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique);
};

const normalizeCatalogEntries = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry: unknown): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
  );
};

const resolveTriggerCatalogIds = (entityJson: Record<string, unknown>): string[] => {
  const explicitCatalogIds = normalizeTriggerCatalogIds(entityJson['catalogIds']);
  if (explicitCatalogIds.length > 0) {
    return explicitCatalogIds;
  }

  const catalogs = normalizeCatalogEntries(entityJson['catalogs']);
  const catalogIdsFromCatalogs = normalizeTriggerCatalogIds(catalogs);
  if (catalogIdsFromCatalogs.length > 0) {
    return catalogIdsFromCatalogs;
  }

  if (typeof entityJson['catalogId'] === 'string' && entityJson['catalogId'].trim().length > 0) {
    return [entityJson['catalogId'].trim()];
  }

  return [];
};

export const buildTriggeredProductEntityJson = (args: {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  values: Record<string, unknown>;
}): Record<string, unknown> => {
  const base = args.product ?? args.draft ?? {};
  const entityJson: Record<string, unknown> = {
    ...base,
    ...args.values,
    ...(args.product?.id ? { id: args.product.id } : {}),
  };

  normalizeProductTriggerStatus(entityJson);

  const catalogIds = resolveTriggerCatalogIds(entityJson);
  if (catalogIds.length === 0) {
    return entityJson;
  }

  const existingCatalogs = normalizeCatalogEntries(entityJson['catalogs']);
  entityJson['catalogId'] = catalogIds[0] ?? entityJson['catalogId'];
  entityJson['catalogs'] = catalogIds.map((catalogId: string) => {
    const existing =
      existingCatalogs.find(
        (entry: unknown) =>
          entry &&
          typeof entry === 'object' &&
          typeof (entry as { catalogId?: unknown }).catalogId === 'string' &&
          (entry as { catalogId: string }).catalogId.trim() === catalogId
      ) ?? null;
    if (existing && typeof existing === 'object') {
      return {
        ...existing,
        catalogId,
      };
    }
    return {
      catalogId,
      ...(args.product?.id ? { productId: args.product.id } : {}),
    };
  });
  return entityJson;
};
