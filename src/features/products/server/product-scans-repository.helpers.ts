import 'server-only';

import type { Filter } from 'mongodb';

import {
  normalizeProductScanRecord,
  type ProductScanProvider,
  type ProductScanRecord,
  type ProductScanStatus,
} from '@/shared/contracts/product-scans';

export type ProductScanDoc = Omit<ProductScanRecord, 'createdAt' | 'updatedAt' | 'completedAt'> & {
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export const ENGINE_RUN_ID_INDEX_NAME = 'product_scans_engineRunId_unique';
export const ACTIVE_PRODUCT_PROVIDER_INDEX_NAME = 'product_scans_active_product_provider_unique';
export const LEGACY_ENGINE_RUN_ID_INDEX_NAME = 'engineRunId_1';

export const createDuplicateConstraintError = (message: string): Error => {
  const error = new Error(message) as Error & { code?: number };
  error.code = 11000;
  return error;
};

export const toScanRecord = (doc: ProductScanDoc): ProductScanRecord =>
  normalizeProductScanRecord({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    completedAt: doc.completedAt !== null ? doc.completedAt.toISOString() : null,
  });

export const toDocUpdate = (
  scan: ProductScanRecord
): Omit<ProductScanDoc, 'createdAt' | 'updatedAt' | 'completedAt'> & {
  completedAt: Date | null;
} => {
  const { createdAt, updatedAt, completedAt, ...rest } = scan;
  void createdAt;
  void updatedAt;
  return {
    ...rest,
    completedAt:
      completedAt !== null && completedAt.length > 0 ? new Date(completedAt) : null,
  };
};

export const sortByCreatedAtDesc = (scans: ProductScanRecord[]): ProductScanRecord[] =>
  [...scans].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

export const normalizeIdList = (value: string[] | null | undefined): string[] =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );

const normalizeOptionalId = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

type ProductScanFilterInput = {
  ids?: string[] | null;
  productId?: string | null;
  productIds?: string[] | null;
  statuses?: ProductScanStatus[] | null;
  provider?: ProductScanProvider | null;
};

export const buildMongoFilter = (input: ProductScanFilterInput): Filter<ProductScanDoc> => {
  const filter: Filter<ProductScanDoc> = {};
  const ids = normalizeIdList(input.ids);
  const productIds = normalizeIdList(input.productIds);
  const productId = normalizeOptionalId(input.productId);
  const statuses = normalizeIdList(input.statuses) as ProductScanStatus[];

  if (ids.length > 0) filter['id'] = { $in: ids };
  if (productId !== null) filter['productId'] = productId;
  if (productId === null && productIds.length > 0) filter['productId'] = { $in: productIds };
  if (statuses.length > 0) filter['status'] = { $in: statuses };
  if (input.provider !== null && input.provider !== undefined) filter['provider'] = input.provider;
  return filter;
};

export const matchesFilter = (
  scan: ProductScanRecord,
  input: ProductScanFilterInput
): boolean => matchesIds(scan, input) &&
  matchesProduct(scan, input) &&
  matchesStatuses(scan, input) &&
  matchesProvider(scan, input);

const matchesIds = (scan: ProductScanRecord, input: ProductScanFilterInput): boolean => {
  const ids = normalizeIdList(input.ids);
  return ids.length === 0 || ids.includes(scan.id);
};

const matchesProduct = (scan: ProductScanRecord, input: ProductScanFilterInput): boolean => {
  const productIds = normalizeIdList(input.productIds);
  const productId = normalizeOptionalId(input.productId);
  if (productId !== null) return scan.productId === productId;
  return productIds.length === 0 || productIds.includes(scan.productId);
};

const matchesStatuses = (scan: ProductScanRecord, input: ProductScanFilterInput): boolean => {
  const statuses = normalizeIdList(input.statuses) as ProductScanStatus[];
  return statuses.length === 0 || statuses.includes(scan.status);
};

const matchesProvider = (scan: ProductScanRecord, input: ProductScanFilterInput): boolean => {
  if (input.provider === null || input.provider === undefined) return true;
  return scan.provider === input.provider;
};

const isActiveScan = (scan: Pick<ProductScanRecord, 'status'>): boolean =>
  scan.status === 'queued' || scan.status === 'running';

const findConflictingActiveScan = (
  scans: ProductScanRecord[],
  normalized: ProductScanRecord
): ProductScanRecord | undefined =>
  scans.find(
    (entry) =>
      entry.id !== normalized.id &&
      entry.productId === normalized.productId &&
      entry.provider === normalized.provider &&
      isActiveScan(entry) &&
      isActiveScan(normalized)
  );

const findConflictingEngineRunScan = (
  scans: ProductScanRecord[],
  normalized: ProductScanRecord,
  normalizedEngineRunId: string
): ProductScanRecord | undefined =>
  scans.find((entry) => entry.id !== normalized.id && entry.engineRunId === normalizedEngineRunId);

export const upsertInMemoryProductScan = (input: {
  normalized: ProductScanRecord;
  now: Date;
  scans: ProductScanRecord[];
}): { record: ProductScanRecord; scans: ProductScanRecord[] } => {
  const conflictingActiveScan = findConflictingActiveScan(input.scans, input.normalized);
  if (conflictingActiveScan !== undefined) {
    throw createDuplicateConstraintError(
      'Another active product scan already exists for this product and provider.'
    );
  }

  const normalizedEngineRunId = input.normalized.engineRunId?.trim() ?? '';
  if (normalizedEngineRunId.length > 0) {
    const conflictingEngineRunScan = findConflictingEngineRunScan(
      input.scans,
      input.normalized,
      normalizedEngineRunId
    );
    if (conflictingEngineRunScan !== undefined) {
      throw createDuplicateConstraintError(
        `Another product scan already uses engine run id ${normalizedEngineRunId}.`
      );
    }
  }

  const record = {
    ...input.normalized,
    createdAt: input.normalized.createdAt,
    updatedAt: input.now.toISOString(),
    completedAt: input.normalized.completedAt,
  };
  const existingIndex = input.scans.findIndex((entry) => entry.id === input.normalized.id);
  if (existingIndex < 0) return { record, scans: [record, ...input.scans] };

  const nextScans = [...input.scans];
  nextScans[existingIndex] = record;
  return { record, scans: nextScans };
};
