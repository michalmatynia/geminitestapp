import 'server-only';

import {
  DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
} from '@/features/products/scanner-settings';
import type { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import {
  type ProductScanRecord,
  type ProductScanBatchItem,
  type ProductScanRequestSequenceEntry,
  type ProductScanStepGroup,
} from '@/shared/contracts/product-scans';
import {
  PRODUCT_SCAN_ERROR_MAX_LENGTH,
  PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE,
  PRODUCT_SCAN_URL_MAX_LENGTH,
  PRODUCT_SCAN_URL_PATTERN,
} from './product-scans-service.constants';

export const toRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && Array.isArray(value) === false
    ? (value as Record<string, unknown>)
    : null;

export const readOptionalString = (value: unknown, maxLength?: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return typeof maxLength === 'number' ? trimmed.slice(0, maxLength) : trimmed;
};

export const normalizeErrorMessage = (
  value: unknown,
  fallback: string
): string => readOptionalString(value, PRODUCT_SCAN_ERROR_MAX_LENGTH) ?? fallback;

export const resolveManualVerificationMessage = (value: unknown): string => {
  const normalized = normalizeErrorMessage(value, PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE);
  return /continue automatically/i.test(normalized)
    ? normalized
    : PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE;
};

export const resolveIsoAgeMs = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return Date.now() - timestamp;
};

export const resolveScanEngineRunId = (scan: ProductScanRecord): string | null =>
  readOptionalString(scan.engineRunId);

export const resolveScanManualVerificationTimeoutMs = (
  rawResult: Record<string, unknown> | ReturnType<typeof createDefaultProductScannerSettings>
): number => {
  const value = rawResult['manualVerificationTimeoutMs'];
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS;
};

export const shouldAutoShowScannerCaptchaBrowser = (
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>
): boolean => scannerSettings.captchaBehavior === 'auto_show_browser';

const PRODUCT_SCAN_STEP_GROUPS = new Set<ProductScanStepGroup>([
  'input',
  'google_lens',
  'amazon',
  'supplier',
  'product',
]);

const normalizeProductScanStepGroup = (value: unknown): ProductScanStepGroup | null => {
  const normalized = readOptionalString(value);
  return normalized !== null && PRODUCT_SCAN_STEP_GROUPS.has(normalized as ProductScanStepGroup)
    ? (normalized as ProductScanStepGroup)
    : null;
};

export const normalizeProductScanRequestSequence = (
  value: unknown
): ProductScanRequestSequenceEntry[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const normalized = value
    .map((item: unknown): ProductScanRequestSequenceEntry | null => {
      const stepKey = readOptionalString(item, 120);
      if (stepKey !== null) {
        return stepKey;
      }

      const record = toRecord(item);
      const key = readOptionalString(record?.['key'], 120);
      if (key === null) {
        return null;
      }

      const label = readOptionalString(record?.['label'], 160);
      const group = normalizeProductScanStepGroup(record?.['group']);
      return {
        key,
        ...(label !== null ? { label } : {}),
        ...(group !== null ? { group } : {}),
      };
    })
    .filter((item): item is ProductScanRequestSequenceEntry => item !== null);

  return normalized.length > 0 ? normalized : null;
};

export const resolveProductScanRequestSequenceInput = (
  rawResult: unknown
): {
  stepSequenceKey?: string;
  stepSequence?: ProductScanRequestSequenceEntry[];
} => {
  const record = toRecord(rawResult);
  const stepSequenceKey = readOptionalString(record?.['stepSequenceKey']) ?? undefined;
  const stepSequence = normalizeProductScanRequestSequence(record?.['stepSequence']) ?? undefined;

  return {
    ...(stepSequenceKey ? { stepSequenceKey } : {}),
    ...(stepSequence ? { stepSequence } : {}),
  };
};

export const resolvePersistableScanUrl = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = readOptionalString(value);
    if (normalized !== null && PRODUCT_SCAN_URL_PATTERN.test(normalized)) {
      return normalized.slice(0, PRODUCT_SCAN_URL_MAX_LENGTH);
    }
  }
  return null;
};

export const resolveAsinUpdateStepStatus = (
  asinUpdateStatus: ProductScanRecord['asinUpdateStatus']
): ProductScanRecord['steps'][number]['status'] => {
  if (asinUpdateStatus === 'failed') return 'failed';
  if (asinUpdateStatus === 'pending' || asinUpdateStatus === null) return 'pending';
  if (asinUpdateStatus === 'not_needed') return 'skipped';
  return 'completed';
};

const normalizeStartedRawStatus = (status: unknown): ProductScanRecord['status'] | null => {
  if (status === 'queued' || status === 'running' || status === 'completed' || status === 'failed') {
    return status;
  }
  if (status === 'pending') return 'queued';
  if (status === 'cancelled' || status === 'canceled') return 'failed';
  return null;
};

export const createProductScanStartedRawResult = (input: {
  runId: string;
  status?: unknown;
  runtimeKey?: string | null;
  actionId?: string | null;
  selectorProfile?: string | null;
  imageSearchProvider?: string | null;
  imageSearchPageUrl?: string | null;
  imageSearchProviderHistory?: unknown;
  allowManualVerification?: boolean;
  previousRunId?: string | null;
  previousResult?: unknown;
  manualVerificationPending?: boolean;
  manualVerificationMessage?: string | null;
  manualVerificationTimeoutMs?: number;
  stepSequenceKey?: string;
  stepSequence?: ProductScanRequestSequenceEntry[];
}): Record<string, unknown> => {
  const status = normalizeStartedRawStatus(input.status);
  return {
    runId: input.runId,
    ...(status !== null ? { status } : {}),
    ...(input.runtimeKey ? { runtimeKey: input.runtimeKey } : {}),
    ...(input.actionId ? { actionId: input.actionId } : {}),
    ...(input.selectorProfile ? { selectorProfile: input.selectorProfile } : {}),
    imageSearchProvider: input.imageSearchProvider ?? null,
    ...(input.imageSearchPageUrl ? { imageSearchPageUrl: input.imageSearchPageUrl } : {}),
    ...(input.imageSearchProviderHistory !== undefined
      ? { imageSearchProviderHistory: input.imageSearchProviderHistory }
      : {}),
    allowManualVerification: input.allowManualVerification ?? false,
    ...(input.previousRunId ? { previousRunId: input.previousRunId } : {}),
    ...(input.previousResult !== undefined ? { previousResult: input.previousResult } : {}),
    manualVerificationPending: input.manualVerificationPending ?? false,
    manualVerificationMessage: input.manualVerificationMessage ?? null,
    manualVerificationTimeoutMs:
      input.manualVerificationTimeoutMs ?? DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
    ...(input.stepSequenceKey ? { stepSequenceKey: input.stepSequenceKey } : {}),
    ...(input.stepSequence ? { stepSequence: input.stepSequence } : {}),
  };
};

export const createFailedBatchResult = (
  productId: string,
  message: string
): ProductScanBatchItem => ({
  productId,
  scanId: null,
  runId: null,
  status: 'failed',
  currentStatus: 'failed',
  message,
});

export const readOptionalPositiveInt = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value > 0 ? Math.trunc(value) : null;
};
