import { createHash } from 'crypto';
import path from 'path';

import type {
  BaseImportDirectTarget,
  BaseImportErrorClass,
  BaseImportErrorCode,
  BaseImportItemRecord,
  BaseImportParameterImportSummary,
  BaseImportItemStatus,
  BaseImportMode,
  BaseImportRunParams,
  BaseImportRunStatus,
} from '@/shared/contracts/integrations/base-com';
import type { PriceGroupLookup, BaseConnectionContext } from '@/shared/contracts/integrations/base-api';
import type { ImportDecision, ProcessItemResult, NormalizedMappedProduct } from '@/shared/contracts/integrations/processing';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type {
  BaseImportErrorClass,
  BaseImportErrorCode,
  BaseImportDirectTarget,
  BaseImportItemRecord,
  BaseImportParameterImportSummary,
  BaseImportItemStatus,
  BaseImportMode,
  BaseImportRunParams,
  BaseImportRunStatus,
  PriceGroupLookup,
  BaseConnectionContext,
  ImportDecision,
  ProcessItemResult,
  NormalizedMappedProduct,
};

export const MAX_IMAGES_PER_PRODUCT = 15;

export type StartBaseImportRunInput = BaseImportRunParams;

export type ProductLookupMaps = {
  producerIdSet: Set<string>;
  producerNameToId: Map<string, string>;
  tagIdSet: Set<string>;
  tagNameToId: Map<string, string>;
  externalTagToInternalTagId: Map<string, string>;
};

const DEFAULT_BASE_IMPORT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_IMPORT_RETRY_BASE_DELAY_MS = 2_000;
const DEFAULT_BASE_IMPORT_RETRY_MAX_DELAY_MS = 60_000;
const DEFAULT_BASE_IMPORT_LEASE_MS = 60_000;
const DEFAULT_BASE_IMPORT_HEARTBEAT_EVERY_ITEMS = 10;

const toPositiveIntOrFallback = (value: string | undefined, fallback: number): number => {
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

export const BASE_DETAILS_BATCH_SIZE = 100;
export const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

export const nowIso = (): string => new Date().toISOString();

export const toStringId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const normalizeCurrencyCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const compact = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return compact.length === 3 ? compact : null;
};

export const addCurrencyCandidate = (target: Set<string>, value: unknown): void => {
  const code = normalizeCurrencyCode(value);
  if (code) target.add(code);
};

export const sanitizeSku = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const MIME_TYPE_BY_IMAGE_EXTENSION: Record<string, string> = {
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

const resolveImageExtension = (url: string): string | null => {
  const normalized = url.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const withoutHash = normalized.split('#', 1)[0] ?? normalized;
  const pathname = (withoutHash.split('?', 1)[0] ?? withoutHash).trim();
  const extension = pathname.split('.').pop()?.trim() ?? '';
  return extension.length > 0 ? extension : null;
};

export const guessMimeType = (url: string): string =>
  MIME_TYPE_BY_IMAGE_EXTENSION[resolveImageExtension(url) ?? ''] ?? 'image/jpeg';

export const extractFilename = (url: string, fallback: string): string => {
  try {
    const parsed = new URL(url);
    const base = path.basename(parsed.pathname);
    return base || fallback;
  } catch (error) {
    logClientError(error);
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
      (selectedIds ?? []).map((id: string) => id.trim()).filter((id: string) => id.length > 0)
    )
  );

export const normalizeDirectTarget = (
  directTarget: BaseImportDirectTarget | undefined
): BaseImportDirectTarget | null => {
  if (!directTarget) {
    return null;
  }

  const value = directTarget.value.trim();
  if (!value) {
    return null;
  }

  return {
    type: directTarget.type,
    value,
  };
};

export const isExactTargetImport = (
  directTarget: BaseImportDirectTarget | null | undefined
): boolean => normalizeDirectTarget(directTarget ?? undefined) !== null;

export const shouldFilterToUniqueOnly = (input: {
  uniqueOnly: boolean;
  selectedIds?: string[];
  directTarget?: BaseImportDirectTarget | null;
}): boolean => {
  if (!input.uniqueOnly) return false;
  if (normalizeDirectTarget(input.directTarget ?? undefined)) return false;
  return normalizeSelectedIds(input.selectedIds).length === 0;
};

export const shouldReuseIdempotentRun = (status: BaseImportRunStatus): boolean =>
  status === 'queued' || status === 'running';

export const resolveMode = (mode: BaseImportMode | undefined): BaseImportMode =>
  mode ?? 'upsert_on_base_id';

export const resolveEffectiveMode = (input: {
  mode: BaseImportMode | undefined;
  directTarget?: BaseImportDirectTarget | null;
}): BaseImportMode => (isExactTargetImport(input.directTarget) ? 'create_only' : resolveMode(input.mode));

export const createRunIdempotencyKey = (params: BaseImportRunParams, ids: string[]): string => {
  const hash = createHash('sha1');
  hash.update(
    JSON.stringify({
      connectionId: params.connectionId,
      inventoryId: params.inventoryId,
      catalogId: params.catalogId,
      templateId: params.templateId ?? null,
      imageMode: params.imageMode,
      uniqueOnly: params.uniqueOnly,
      allowDuplicateSku: params.allowDuplicateSku,
      dryRun: params.dryRun ?? false,
      mode: resolveEffectiveMode(params),
      requestId: params.requestId ?? null,
      directTarget: normalizeDirectTarget(params.directTarget) ?? null,
      ids,
    })
  );
  return hash.digest('hex');
};
