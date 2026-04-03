import type { ProductDraft, ProductWithImages } from '@/shared/contracts/products';

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

  const catalogIds = normalizeTriggerCatalogIds(entityJson['catalogIds']);
  if (catalogIds.length === 0) {
    return entityJson;
  }

  const existingCatalogs: unknown[] = Array.isArray(entityJson['catalogs'])
    ? (entityJson['catalogs'] as unknown[])
    : [];
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
        ...(existing as Record<string, unknown>),
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
