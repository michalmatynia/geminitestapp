import { ObjectId, type Document, type Filter } from 'mongodb';

import { productAdvancedFilterGroupSchema } from '@/shared/contracts/products/filters';
import { type ProductAdvancedFilterGroup, type ProductParameterValue } from '@/shared/contracts/products';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import { normalizeProductCustomFieldValues } from '@/shared/lib/products/utils/custom-field-values';
import {
  mergeProductParameterValue,
  normalizeParameterValuesByLanguage,
  resolveStoredParameterValue,
} from '@/shared/lib/products/utils/parameter-values';
import { logger } from '@/shared/utils/logger';

import { type ProductDocument } from './mongo-product-repository-mappers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';



export const BASE_INTEGRATION_SLUGS = ['baselinker', 'base-com', 'base'] as const;

export const productCollectionName = 'products';
export const integrationCollectionName = 'integrations';
export const listingCollectionName = 'product_listings';

export type IntegrationSlugDocument = {
  _id: string | ObjectId;
  slug: string;
};

export type ProductListingFilterDocument = {
  productId: string | ObjectId;
  integrationId: string | ObjectId;
  externalListingId?: string | null;
};

export type BaseExportLookupContext = {
  integrationLookupValues: Array<string | ObjectId>;
  exportedProductIds: string[];
  exportedProductLookupValues: Array<string | ObjectId>;
};

export const isEmptyFilter = (filter: Filter<ProductDocument>): boolean =>
  Object.keys(filter as Record<string, unknown>).length === 0;

export const appendAndCondition = (
  filter: Filter<ProductDocument>,
  condition: Filter<ProductDocument>
): Filter<ProductDocument> => {
  if (isEmptyFilter(filter)) return condition;
  return {
    $and: [filter, condition],
  } as Filter<ProductDocument>;
};

export const normalizeLookupId = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
  }
  if (value instanceof ObjectId) {
    return value.toHexString();
  }
  return '';
};

export const buildLookupValues = (ids: string[]): Array<string | ObjectId> => {
  const seen = new Set<string>();
  const values: Array<string | ObjectId> = [];

  ids.forEach((rawId: string) => {
    const normalized = rawId.trim();
    if (!normalized) return;

    const stringKey = `s:${normalized}`;
    if (!seen.has(stringKey)) {
      seen.add(stringKey);
      values.push(normalized);
    }

    if (!ObjectId.isValid(normalized)) return;
    const objectId = new ObjectId(normalized);
    const objectKey = `o:${objectId.toHexString()}`;
    if (!seen.has(objectKey)) {
      seen.add(objectKey);
      values.push(objectId);
    }
  });

  return values;
};

export const normalizeProductParameterValues = (input: unknown): ProductParameterValue[] => {
  if (!Array.isArray(input)) return [];
  const byParameterId = new Map<string, ProductParameterValue>();

  input.forEach((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const record = raw as Record<string, unknown>;
    const parameterIdRaw =
      typeof record['parameterId'] === 'string' ? record['parameterId'].trim() : '';
    const parameterId = decodeSimpleParameterStorageId(parameterIdRaw);
    if (!parameterId) return;
    const value = typeof record['value'] === 'string' ? record['value'].trim() : '';
    const valuesByLanguage = normalizeParameterValuesByLanguage(record['valuesByLanguage']);
    const hasLocalizedValues = Object.keys(valuesByLanguage).length > 0;
    const existingEntry = byParameterId.get(parameterId);
    const skipParameterInference = record['skipParameterInference'] === true;
    byParameterId.set(
      parameterId,
      hasLocalizedValues
        ? mergeProductParameterValue(existingEntry, {
          parameterId,
          value,
          valuesByLanguage,
          skipParameterInference,
        })
        : {
          parameterId,
          value: resolveStoredParameterValue({}, value),
          ...(skipParameterInference ? { skipParameterInference: true } : {}),
        }
    );
  });

  return Array.from(byParameterId.values());
};

export { normalizeProductCustomFieldValues };

export const normalizeImageFileIds = (imageFileIds: string[]): string[] => {
  const unique = new Set<string>();
  for (const rawId of imageFileIds) {
    const trimmed = rawId.trim();
    if (!trimmed || unique.has(trimmed)) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
};

export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const parseAdvancedFilterGroup = (
  payload: string | undefined
): ProductAdvancedFilterGroup | null => {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    const validated = productAdvancedFilterGroupSchema.safeParse(parsed);
    if (validated.success) return validated.data;
    logger.warn('[products.advanced-filter.mongo] validation failed', {
      issues: validated.error.issues.slice(0, 5).map((issue) => issue.message),
    });
    return null;
  } catch (error) {
    logClientError(error);
    logger.warn('[products.advanced-filter.mongo] invalid JSON payload');
    return null;
  }
};

export const toAdvancedStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const toAdvancedNumberValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const toAdvancedDateValue = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

export const toAdvancedBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return null;
};

export const toAdvancedStringArrayValues = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const normalizedValues = value
    .map((entry: unknown) => toAdvancedStringValue(entry))
    .filter((entry: string | null): entry is string => entry !== null);
  return Array.from(new Set(normalizedValues));
};

export const resolveLookupDocumentId = (doc: Document | null | undefined): string =>
  normalizeLookupId(
    (doc as { id?: unknown; _id?: unknown } | null)?.id ?? (doc as { _id?: unknown } | null)?._id
  );

export const buildProductIdFilter = (id: string): Filter<ProductDocument> => {
  const normalized = id.trim();
  const conditions: Array<Record<string, unknown>> = [{ id: normalized }, { _id: normalized }];
  if (ObjectId.isValid(normalized)) {
    conditions.push({ _id: new ObjectId(normalized) });
  }
  return { $or: conditions } as Filter<ProductDocument>;
};

export const buildCategoryLookupFilter = (id: string): Filter<Document> => {
  const normalized = id.trim();
  const conditions: Array<Record<string, unknown>> = [{ id: normalized }, { _id: normalized }];
  if (ObjectId.isValid(normalized)) {
    conditions.push({ _id: new ObjectId(normalized) });
  }
  return { $or: conditions } as Filter<Document>;
};

export const buildLookupFilterForIds = (ids: string[]): Filter<Document> => {
  const normalizedIds = Array.from(
    new Set(
      ids.map((id: string): string => id.trim()).filter((id: string): boolean => id.length > 0)
    )
  );
  const objectIds = normalizedIds
    .filter((id: string): boolean => ObjectId.isValid(id))
    .map((id: string): ObjectId => new ObjectId(id));
  const conditions: Array<Record<string, unknown>> = [];
  if (normalizedIds.length > 0) {
    conditions.push({ id: { $in: normalizedIds } });
    conditions.push({ _id: { $in: normalizedIds } });
  }
  if (objectIds.length > 0) {
    conditions.push({ _id: { $in: objectIds } });
  }
  if (conditions.length === 0) {
    return { _id: { $in: [] } } as Filter<Document>;
  }
  if (conditions.length === 1) {
    return conditions[0] as Filter<Document>;
  }
  return { $or: conditions } as Filter<Document>;
};

let baseExportContextCache: {
  data: BaseExportLookupContext;
  timestamp: number;
} | null = null;
const BASE_EXPORT_CACHE_TTL_MS = 60 * 1000;

export const invalidateMongoBaseExportLookupContextCache = (): void => {
  baseExportContextCache = null;
};

export const loadMongoBaseExportLookupContext = async (): Promise<BaseExportLookupContext> => {
  const nowMs = Date.now();
  if (
    baseExportContextCache &&
    nowMs - baseExportContextCache.timestamp < BASE_EXPORT_CACHE_TTL_MS
  ) {
    return baseExportContextCache.data;
  }

  const db = await getMongoDb();
  const integrations = await db
    .collection<IntegrationSlugDocument>(integrationCollectionName)
    .find({ slug: { $in: [...BASE_INTEGRATION_SLUGS] } }, { projection: { _id: 1 } })
    .toArray();

  const integrationIds = integrations
    .map((integration: IntegrationSlugDocument) => normalizeLookupId(integration._id))
    .filter((id: string) => id.length > 0);
  const integrationLookupValues = buildLookupValues(integrationIds);

  if (integrationLookupValues.length === 0) {
    const result = {
      integrationLookupValues,
      exportedProductIds: [],
      exportedProductLookupValues: [],
    };
    baseExportContextCache = { data: result, timestamp: nowMs };
    return result;
  }

  const exportedProductIdsRaw = await db
    .collection<ProductListingFilterDocument>(listingCollectionName)
    .distinct('productId', {
      integrationId: { $in: integrationLookupValues },
      externalListingId: { $exists: true, $nin: [null, ''] },
    });

  const exportedProductIds = (exportedProductIdsRaw as unknown[])
    .map((value: unknown) => normalizeLookupId(value))
    .filter((id: string) => id.length > 0);
  const exportedProductLookupValues = buildLookupValues(exportedProductIds);

  const result = {
    integrationLookupValues,
    exportedProductIds,
    exportedProductLookupValues,
  };
  baseExportContextCache = { data: result, timestamp: nowMs };
  return result;
};
