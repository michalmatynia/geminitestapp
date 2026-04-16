import 'server-only';

import {
  DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
} from '@/features/products/scanner-settings';
import type { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import {
  type ProductScanRecord,
  type ProductAmazonBatchScanItem,
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
): boolean => scannerSettings.autoShowCaptchaBrowser !== false;

export const normalizeProductScanRequestSequence = (
  value: unknown
): ProductScanRecord['steps'][number]['key'][] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value
    .map((item: unknown) => readOptionalString(item))
    .filter((item): item is ProductScanRecord['steps'][number]['key'] => item !== null);
};

export const resolveProductScanRequestSequenceInput = (
  rawResult: unknown
): {
  stepSequenceKey?: string;
  stepSequence?: ProductScanRecord['steps'][number]['key'][];
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
  asin: string | null | undefined
): ProductScanRecord['asinUpdateStatus'] => (asin && asin.trim().length > 0 ? 'completed' : 'not_needed');

export const createAmazonScanStartedRawResult = (input: {
  runId: string;
  imageSearchProvider?: string | null;
  manualVerificationTimeoutMs?: number;
  stepSequenceKey?: string;
  stepSequence?: string[];
}): Record<string, unknown> => ({
  runId: input.runId,
  imageSearchProvider: input.imageSearchProvider ?? null,
  manualVerificationPending: false,
  manualVerificationMessage: null,
  manualVerificationTimeoutMs:
    input.manualVerificationTimeoutMs ?? DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
  ...(input.stepSequenceKey ? { stepSequenceKey: input.stepSequenceKey } : {}),
  ...(input.stepSequence ? { stepSequence: input.stepSequence } : {}),
});

export const createFailedBatchResult = (
  productId: string,
  message: string
): ProductAmazonBatchScanItem => ({
  productId,
  scanId: null,
  status: 'failed',
  message,
  resultStatusLabel: 'Scan failed',
});

export const readOptionalPositiveInt = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value > 0 ? Math.trunc(value) : null;
};
