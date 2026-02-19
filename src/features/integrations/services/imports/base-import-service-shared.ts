import { createHash } from 'crypto';
import path from 'path';

import type {
  BaseImportErrorClass,
  BaseImportErrorCode,
  BaseImportItemRecord,
  BaseImportParameterImportSummary,
  BaseImportItemStatus,
  BaseImportMode,
  BaseImportRunParams,
  BaseImportRunStatus,
} from '@/features/integrations/types/base-import-runs';
import type {
  PriceGroupLookupDto,
  BaseImportRunParamsDto,
  BaseConnectionContextDto,
} from '@/shared/contracts/integrations';
import type { ProductDto as ProductRecord, CreateProductDto as ProductCreateInput } from '@/shared/contracts/products';

export const BASE_DETAILS_BATCH_SIZE = 100;
export const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);
export const MAX_IMAGES_PER_PRODUCT = 15;

const DEFAULT_BASE_IMPORT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_IMPORT_RETRY_BASE_DELAY_MS = 2_000;
const DEFAULT_BASE_IMPORT_RETRY_MAX_DELAY_MS = 60_000;
const DEFAULT_BASE_IMPORT_LEASE_MS = 60_000;
const DEFAULT_BASE_IMPORT_HEARTBEAT_EVERY_ITEMS = 10;

export type PriceGroupLookup = PriceGroupLookupDto;

export type StartBaseImportRunInput = BaseImportRunParamsDto;

export type BaseConnectionContext = BaseConnectionContextDto;

export type ProductLookupMaps = {
  producerIdSet: Set<string>;
  producerNameToId: Map<string, string>;
  tagIdSet: Set<string>;
  tagNameToId: Map<string, string>;
  externalTagToInternalTagId: Map<string, string>;
};

export type ImportDecision =
  | { type: 'create' }
  | { type: 'update'; target: ProductRecord }
  | { type: 'skip'; code: BaseImportErrorCode; message: string }
  | { type: 'fail'; code: BaseImportErrorCode; message: string };

export type ProcessItemResult = {
  status: Exclude<BaseImportItemStatus, 'pending' | 'processing'>;
  action: BaseImportItemRecord['action'];
  importedProductId?: string | null;
  baseProductId?: string | null;
  sku?: string | null;
  errorCode?: BaseImportErrorCode | null;
  errorClass?: BaseImportErrorClass | null;
  errorMessage?: string | null;
  retryable?: boolean | null;
  nextRetryAt?: string | null;
  lastErrorAt?: string | null;
  payloadSnapshot?: ProductCreateInput | null;
  parameterImportSummary?: BaseImportParameterImportSummary | null;
};

export type NormalizedMappedProduct = ProductCreateInput & {
  producerIds?: string[];
  tagIds?: string[];
};

const toPositiveIntOrFallback = (
  value: string | undefined,
  fallback: number
): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const BASE_IMPORT_MAX_ATTEMPTS = toPositiveIntOrFallback(
  process.env['BASE_IMPORT_MAX_ATTEMPTS'],
  DEFAULT_BASE_IMPORT_MAX_ATTEMPTS
);

export const BASE_IMPORT_RETRY_BASE_DELAY_MS = toPositiveIntOrFallback(
  process.env['BASE_IMPORT_RETRY_BASE_DELAY_MS'],
  DEFAULT_BASE_IMPORT_RETRY_BASE_DELAY_MS
);

export const BASE_IMPORT_RETRY_MAX_DELAY_MS = toPositiveIntOrFallback(
  process.env['BASE_IMPORT_RETRY_MAX_DELAY_MS'],
  DEFAULT_BASE_IMPORT_RETRY_MAX_DELAY_MS
);

export const BASE_IMPORT_LEASE_MS = toPositiveIntOrFallback(
  process.env['BASE_IMPORT_LEASE_MS'],
  DEFAULT_BASE_IMPORT_LEASE_MS
);

export const BASE_IMPORT_HEARTBEAT_EVERY_ITEMS = toPositiveIntOrFallback(
  process.env['BASE_IMPORT_HEARTBEAT_EVERY_ITEMS'],
  DEFAULT_BASE_IMPORT_HEARTBEAT_EVERY_ITEMS
);

export const nowIso = (): string => new Date().toISOString();

export const toStringId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const normalizeCurrencyCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const compact = value.trim().toUpperCase().replace(/[^A-Z]/g, '');
  return compact.length === 3 ? compact : null;
};

export const addCurrencyCandidate = (target: Set<string>, value: unknown): void => {
  const code = normalizeCurrencyCode(value);
  if (code) target.add(code);
};

export const sanitizeSku = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

export const guessMimeType = (url: string): string => {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
};

export const extractFilename = (url: string, fallback: string): string => {
  try {
    const parsed = new URL(url);
    const base = path.basename(parsed.pathname);
    return base || fallback;
  } catch {
    return fallback;
  }
};

export const isSkuConflictError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return /sku/i.test(error.message) && /unique|duplicate|conflict/i.test(error.message);
};

export const normalizeSelectedIds = (selectedIds: string[] | undefined): string[] =>
  Array.from(
    new Set(
      (selectedIds ?? [])
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0)
    )
  );

export const shouldFilterToUniqueOnly = (input: {
  uniqueOnly: boolean;
  selectedIds?: string[];
}): boolean => {
  if (!input.uniqueOnly) return false;
  return normalizeSelectedIds(input.selectedIds).length === 0;
};

export const shouldReuseIdempotentRun = (status: BaseImportRunStatus): boolean =>
  status === 'queued' || status === 'running';

export const resolveMode = (mode: BaseImportMode | undefined): BaseImportMode =>
  mode ?? 'upsert_on_base_id';

export const createRunIdempotencyKey = (
  params: BaseImportRunParams,
  ids: string[]
): string => {
  const hash = createHash('sha1');
  hash.update(
    JSON.stringify({
      connectionId: params.connectionId ?? null,
      inventoryId: params.inventoryId,
      catalogId: params.catalogId,
      templateId: params.templateId ?? null,
      imageMode: params.imageMode,
      uniqueOnly: params.uniqueOnly,
      allowDuplicateSku: params.allowDuplicateSku,
      dryRun: params.dryRun ?? false,
      mode: params.mode ?? 'upsert_on_base_id',
      requestId: params.requestId ?? null,
      ids,
    })
  );
  return hash.digest('hex');
};
