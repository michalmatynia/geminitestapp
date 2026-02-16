import type { ProductCreateInput } from '@/features/products/validations/schemas';

export type BaseImportRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

export type BaseImportItemStatus =
  | 'pending'
  | 'processing'
  | 'imported'
  | 'updated'
  | 'skipped'
  | 'failed';

export type BaseImportItemAction =
  | 'pending'
  | 'processing'
  | 'imported'
  | 'updated'
  | 'skipped'
  | 'failed'
  | 'dry_run';

export type BaseImportMode =
  | 'create_only'
  | 'upsert_on_base_id'
  | 'upsert_on_sku';

export type BaseImportErrorCode =
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_SKU'
  | 'BASE_FETCH_ERROR'
  | 'MISSING_BASE_ID'
  | 'MISSING_SKU'
  | 'MISSING_CONNECTION'
  | 'MISSING_CATALOG'
  | 'MISSING_PRICE_GROUP'
  | 'UNEXPECTED_ERROR'
  | 'LINKING_ERROR'
  | 'CONFLICT'
  | 'PRECHECK_FAILED'
  | 'NOT_FOUND';

export type BaseImportRunStats = {
  total: number;
  pending: number;
  processing: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
};

export type BaseImportRunParams = {
  connectionId?: string;
  inventoryId: string;
  catalogId: string;
  templateId?: string;
  limit?: number;
  imageMode: 'links' | 'download';
  uniqueOnly: boolean;
  allowDuplicateSku: boolean;
  selectedIds?: string[];
  dryRun?: boolean;
  mode?: BaseImportMode;
  requestId?: string;
};

export type BaseImportPreflightIssue = {
  code: BaseImportErrorCode;
  message: string;
  severity: 'error' | 'warning';
};

export type BaseImportPreflight = {
  ok: boolean;
  issues: BaseImportPreflightIssue[];
  checkedAt: string;
};

export type BaseImportRunRecord = {
  id: string;
  status: BaseImportRunStatus;
  params: BaseImportRunParams;
  idempotencyKey?: string | null;
  queueJobId?: string | null;
  preflight: BaseImportPreflight;
  stats: BaseImportRunStats;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  summaryMessage?: string | null;
};

export type BaseImportItemRecord = {
  runId: string;
  itemId: string;
  baseProductId?: string | null;
  sku?: string | null;
  status: BaseImportItemStatus;
  attempt: number;
  idempotencyKey: string;
  action: BaseImportItemAction;
  errorCode?: BaseImportErrorCode | null;
  errorMessage?: string | null;
  importedProductId?: string | null;
  payloadSnapshot?: ProductCreateInput | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type BaseImportStartResponse = {
  runId: string;
  status: BaseImportRunStatus;
  preflight: BaseImportPreflight;
  queueJobId?: string | null;
  summaryMessage?: string | null;
};

export type BaseImportRunDetailResponse = {
  run: BaseImportRunRecord;
  items: BaseImportItemRecord[];
};
