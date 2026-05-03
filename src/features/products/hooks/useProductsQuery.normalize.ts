import { z } from 'zod';

import { catalogSchema } from '@/shared/contracts/products/catalogs';
import {
  type ProductWithImages,
  productWithImagesSchema,
} from '@/shared/contracts/products/product';

const productsPagedResultSchema = z.object({
  products: z.array(productWithImagesSchema),
  total: z.number().nonnegative(),
});

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toOptionalFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const firstNonEmptyString = (...values: string[]): string => {
  const value = values.find((entry) => entry.length > 0);
  return value ?? '';
};

const toOptionalTrimmedString = (value: unknown): string | undefined => {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNullableTrimmedString = (value: unknown): string | null => {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const getDerivedPagedImageFilename = (filepath: string): string =>
  filepath.split('/').filter((segment) => segment.length > 0).pop() ?? 'image';

const getPagedImageFileId = (input: {
  derivedFilename: string;
  filepath: string;
  record: Record<string, unknown>;
}): string =>
  firstNonEmptyString(
    toTrimmedString(input.record['id']),
    toTrimmedString(input.record['_id']),
    input.filepath,
    input.derivedFilename
  );

const normalizePagedImageFileRecord = (input: unknown): Record<string, unknown> | undefined => {
  const record = toRecord(input);
  if (record === null) return undefined;

  const filepath = toTrimmedString(record['filepath']);
  const derivedFilename = getDerivedPagedImageFilename(filepath);

  return {
    ...record,
    id: getPagedImageFileId({ derivedFilename, filepath, record }),
    filename: firstNonEmptyString(toTrimmedString(record['filename']), derivedFilename),
    filepath,
    mimetype: firstNonEmptyString(
      toTrimmedString(record['mimetype']),
      'application/octet-stream'
    ),
    size: toOptionalFiniteNumber(record['size']) ?? 0,
    createdAt: toOptionalTrimmedString(record['createdAt']),
    updatedAt: toNullableTrimmedString(record['updatedAt']),
  };
};

const normalizePagedProductCatalogRelation = (input: unknown): Record<string, unknown> => {
  const record = toRecord(input) ?? {};
  const parsedCatalog = catalogSchema.safeParse(record['catalog']);
  if (parsedCatalog.success) return { ...record, catalog: parsedCatalog.data };

  const relation = { ...record };
  delete relation['catalog'];
  return relation;
};

const normalizePagedProductImageRelation = (input: unknown): Record<string, unknown> => {
  const imageRecord = toRecord(input) ?? {};
  return {
    ...imageRecord,
    imageFile: normalizePagedImageFileRecord(imageRecord['imageFile']),
  };
};

const normalizePagedProductRecord = (input: unknown): Record<string, unknown> => {
  const record = toRecord(input) ?? {};
  return {
    ...record,
    images: Array.isArray(record['images'])
      ? record['images'].map(normalizePagedProductImageRelation)
      : record['images'],
    catalogs: Array.isArray(record['catalogs'])
      ? record['catalogs'].map(normalizePagedProductCatalogRelation)
      : record['catalogs'],
  };
};

export const parseProductsPagedResult = (
  payload: unknown
): {
  products: ProductWithImages[];
  total: number;
} => {
  const record = toRecord(payload) ?? {};
  const productsRaw = record['products'];
  return productsPagedResultSchema.parse({
    ...record,
    products: Array.isArray(productsRaw)
      ? (productsRaw as unknown[]).map(normalizePagedProductRecord)
      : [],
  });
};
