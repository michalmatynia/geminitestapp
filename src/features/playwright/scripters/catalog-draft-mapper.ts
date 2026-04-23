import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';
import { removeUndefined } from '@/shared/utils/object-utils';

import type { MappedScripterRecord } from './types';

export type ScripterCatalogDefaults = {
  catalogIds?: string[];
  categoryId?: string | null;
  importSource?: string | null;
  shippingGroupId?: string | null;
  defaultPriceGroupId?: string | null;
};

const buildFallbackName = (mapped: MappedScripterRecord): string => {
  if (mapped.title && mapped.title.trim().length > 0) return mapped.title.trim();
  if (mapped.sku && mapped.sku.trim().length > 0) return `SKU ${mapped.sku.trim()}`;
  if (mapped.externalId && mapped.externalId.trim().length > 0) return `Item ${mapped.externalId.trim()}`;
  return 'Untitled scripter record';
};

export const buildScripterDraftInput = (
  mapped: MappedScripterRecord,
  defaults: ScripterCatalogDefaults = {}
): CreateProductDraftInput => {
  const name = buildFallbackName(mapped);
  const draft: CreateProductDraftInput = removeUndefined({
    name,
    description: mapped.description ?? null,
    sku: mapped.sku ?? null,
    ean: mapped.ean ?? null,
    gtin: null,
    asin: null,
    name_en: mapped.title ?? null,
    name_pl: null,
    name_de: null,
    description_en: mapped.description ?? null,
    description_pl: null,
    description_de: null,
    price: mapped.price ?? null,
    supplierName: null,
    supplierLink: mapped.sourceUrl ?? null,
    priceComment: null,
    stock: null,
    catalogIds: defaults.catalogIds ?? [],
    categoryId: defaults.categoryId ?? null,
    shippingGroupId: defaults.shippingGroupId ?? null,
    tagIds: [],
    producerIds: [],
    parameters: [],
    defaultPriceGroupId: defaults.defaultPriceGroupId ?? null,
    imageLinks: mapped.images,
    baseProductId: null,
    importSource: defaults.importSource ?? null,
  }) as CreateProductDraftInput;
  return draft;
};
