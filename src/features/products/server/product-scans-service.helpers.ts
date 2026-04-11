import 'server-only';

import { randomUUID } from 'crypto';
import { extname } from 'node:path';

import {
  DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
} from '@/features/products/scanner-settings';
import {
  normalizeProductScanRecord,
  productScanAmazonDetailsSchema,
  productScanAmazonProbeSchema,
  productScanStepDetailSchema,
  productScanStepSchema,
  type ProductScanAmazonDetails,
  type ProductScanAmazonProbe,
  type ProductAmazonBatchScanItem,
  type ProductScanRecord,
  type ProductScanStep,
} from '@/shared/contracts/product-scans';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { updateProductScan } from './product-scans-repository';

export const AMAZON_SCAN_TIMEOUT_MS = 180_000;
export const PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS = 60_000;
export const PRODUCT_SCAN_ERROR_MAX_LENGTH = 2_000;
export const PRODUCT_SCAN_BATCH_MESSAGE_MAX_LENGTH = 1_000;
export const PRODUCT_SCAN_TITLE_MAX_LENGTH = 1_000;
export const PRODUCT_SCAN_PRICE_MAX_LENGTH = 200;
export const PRODUCT_SCAN_URL_MAX_LENGTH = 4_000;
export const PRODUCT_SCAN_DESCRIPTION_MAX_LENGTH = 8_000;
export const PRODUCT_SCAN_ASIN_MAX_LENGTH = 40;
export const PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH = 160;
export const PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS = 2;
export const PRODUCT_SCAN_MIN_IMAGE_BYTES = 1;
export const PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
  '.avif',
  '.heic',
  '.heif',
  '.jfif',
]);
export const PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE =
  'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';

const nodeFs = getFsPromises();

export type AmazonScanScriptResult = {
  status: 'matched' | 'probe_ready' | 'no_match' | 'failed' | 'captcha_required' | 'running';
  asin: string | null;
  title: string | null;
  price: string | null;
  url: string | null;
  description: string | null;
  amazonDetails: ProductScanAmazonDetails;
  amazonProbe: ProductScanAmazonProbe;
  matchedImageId: string | null;
  message: string | null;
  currentUrl: string | null;
  stage: string | null;
  steps: ProductScanStep[];
};

export const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
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

export const readOptionalPositiveInt = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
};

export const resolvePersistableScanUrl = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = readOptionalString(value, PRODUCT_SCAN_URL_MAX_LENGTH);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

export const hasSupportedLocalScanImageExtension = (candidate: {
  filepath?: string | null;
  filename?: string | null;
}): boolean => {
  const extensionSource =
    readOptionalString(candidate.filename) ?? readOptionalString(candidate.filepath);
  if (!extensionSource) {
    return false;
  }

  const normalizedExtension = extname(extensionSource).toLowerCase();
  if (!normalizedExtension) {
    return true;
  }

  return PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS.has(normalizedExtension);
};

export const validateLocalScanImageCandidatePath = async (
  candidate: Pick<ProductScanRecord['imageCandidates'][number], 'filepath' | 'filename'>
): Promise<boolean> => {
  const normalizedFilepath = readOptionalString(candidate.filepath);
  if (!normalizedFilepath) {
    return false;
  }
  if (!hasSupportedLocalScanImageExtension(candidate)) {
    return false;
  }

  try {
    const fileStats = await nodeFs.stat(normalizedFilepath);
    return fileStats.isFile() && fileStats.size >= PRODUCT_SCAN_MIN_IMAGE_BYTES;
  } catch {
    return false;
  }
};

export const sanitizeProductScanImageCandidates = async (
  imageCandidates: ProductScanRecord['imageCandidates']
): Promise<ProductScanRecord['imageCandidates']> => {
  const sanitizedCandidates = await Promise.all(
    imageCandidates.map(async (candidate) => {
      const filepathValid = await validateLocalScanImageCandidatePath(candidate);
      const hasUrl = Boolean(readOptionalString(candidate.url));

      if (filepathValid) {
        return candidate;
      }

      if (!hasUrl) {
        return null;
      }

      return {
        ...candidate,
        filepath: null,
      };
    })
  );

  return sanitizedCandidates.filter(
    (candidate): candidate is ProductScanRecord['imageCandidates'][number] => Boolean(candidate)
  );
};

export const resolveIsoAgeMs = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Date.now() - parsed;
};

export const resolveScanEngineRunId = (scan: ProductScanRecord): string | null =>
  readOptionalString(scan.engineRunId, 160) ??
  readOptionalString(toRecord(scan.rawResult)?.['runId'], 160);

export const resolveScanManualVerificationTimeoutMs = (
  settingsOrRawResult: { manualVerificationTimeoutMs?: unknown } | null | undefined
): number =>
  readOptionalPositiveInt(settingsOrRawResult?.manualVerificationTimeoutMs) ??
  DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS;

export const shouldAutoShowScannerCaptchaBrowser = (
  settings: { captchaBehavior?: unknown } | null | undefined
): boolean => settings?.captchaBehavior !== 'fail';

export const normalizeParsedProductScanSteps = (value: unknown): ProductScanStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => productScanStepSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data);
};

export const normalizeParsedAmazonDetails = (value: unknown): ProductScanAmazonDetails => {
  const parsed = productScanAmazonDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const normalizeParsedAmazonProbe = (value: unknown): ProductScanAmazonProbe => {
  const parsed = productScanAmazonProbeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const resolveComparableStepAttempt = (attempt: number | null | undefined): number =>
  typeof attempt === 'number' && Number.isFinite(attempt) && attempt > 0 ? Math.trunc(attempt) : 1;

export const resolveProductScanStepGroup = (
  key: string | null | undefined
): ProductScanStep['group'] => {
  const normalizedKey = readOptionalString(key);
  if (!normalizedKey) {
    return null;
  }

  if (
    normalizedKey === 'validate' ||
    normalizedKey === 'prepare_scan' ||
    normalizedKey === 'queue_scan'
  ) {
    return 'input';
  }

  if (normalizedKey.startsWith('google_')) {
    return 'google_lens';
  }

  if (normalizedKey.startsWith('amazon_')) {
    return 'amazon';
  }

  if (normalizedKey.startsWith('product_')) {
    return 'product';
  }

  return null;
};

const normalizeProductScanStepDetails = (
  value: Array<{ label: string; value?: string | null }> | null | undefined
): ProductScanStep['details'] =>
  (Array.isArray(value) ? value : [])
    .map((entry) =>
      productScanStepDetailSchema.safeParse({
        label: entry.label,
        value: entry.value ?? null,
      })
    )
    .filter((entry) => entry.success)
    .map((entry) => entry.data);

const resolveProductScanStepIdentity = (
  step: Pick<ProductScanStep, 'key' | 'attempt' | 'inputSource'>
): string =>
  `${step.key}::${resolveComparableStepAttempt(step.attempt)}::${readOptionalString(step.inputSource) ?? 'none'}`;

const normalizePersistedProductScanStep = (
  input: Partial<ProductScanStep> & Pick<ProductScanStep, 'key' | 'label' | 'status'>
): ProductScanStep => {
  const startedAt = input.startedAt ?? new Date().toISOString();
  const completedAt =
    input.completedAt ??
    (input.status === 'completed' || input.status === 'failed' || input.status === 'skipped'
      ? new Date().toISOString()
      : null);
  const durationMs =
    typeof input.durationMs === 'number' && Number.isFinite(input.durationMs) && input.durationMs >= 0
      ? Math.trunc(input.durationMs)
      : startedAt && completedAt
        ? Math.max(0, Date.parse(completedAt) - Date.parse(startedAt))
        : null;

  return productScanStepSchema.parse({
    key: input.key,
    label: input.label,
    group: input.group ?? resolveProductScanStepGroup(input.key),
    attempt: resolveComparableStepAttempt(input.attempt),
    candidateId: input.candidateId ?? null,
    candidateRank:
      typeof input.candidateRank === 'number' &&
      Number.isFinite(input.candidateRank) &&
      input.candidateRank > 0
        ? Math.trunc(input.candidateRank)
        : null,
    inputSource: input.inputSource ?? null,
    retryOf: input.retryOf ?? null,
    resultCode: input.resultCode ?? null,
    status: input.status,
    message: input.message ?? null,
    warning: input.warning ?? null,
    details: normalizeProductScanStepDetails(input.details),
    url: input.url ?? null,
    startedAt,
    completedAt,
    durationMs,
  });
};

export const areProductScanStepsEqual = (
  left: ProductScanStep[] | null | undefined,
  right: ProductScanStep[] | null | undefined
): boolean => JSON.stringify(left ?? []) === JSON.stringify(right ?? []);

export const resolvePersistedProductScanSteps = (
  scan: Pick<ProductScanRecord, 'steps'>,
  parsedSteps: ProductScanStep[]
): ProductScanStep[] => {
  if (parsedSteps.length === 0) {
    return scan.steps;
  }

  if (scan.steps.length === 0) {
    return parsedSteps;
  }

  const mergedSteps = [...scan.steps];
  for (const parsedStep of parsedSteps) {
    const existingIndex = mergedSteps.findIndex(
      (step) => resolveProductScanStepIdentity(step) === resolveProductScanStepIdentity(parsedStep)
    );
    if (existingIndex < 0) {
      mergedSteps.push(parsedStep);
      continue;
    }
    mergedSteps[existingIndex] = parsedStep;
  }

  return mergedSteps;
};

export const upsertPersistedProductScanStep = (
  steps: ProductScanStep[],
  input: {
    key: string;
    label: string;
    status: ProductScanStep['status'];
    group?: ProductScanStep['group'];
    attempt?: number | null;
    candidateId?: string | null;
    candidateRank?: number | null;
    inputSource?: ProductScanStep['inputSource'];
    retryOf?: string | null;
    resultCode?: string | null;
    message?: string | null;
    warning?: string | null;
    details?: Array<{ label: string; value?: string | null }>;
    url?: string | null;
  }
): ProductScanStep[] => {
  const timestamp = new Date().toISOString();
  const nextStep = normalizePersistedProductScanStep({
    key: input.key,
    label: input.label,
    group: input.group,
    attempt: input.attempt,
    candidateId: input.candidateId ?? null,
    candidateRank: input.candidateRank ?? null,
    inputSource: input.inputSource ?? null,
    retryOf: input.retryOf ?? null,
    resultCode: input.resultCode ?? null,
    status: input.status,
    message: input.message ?? null,
    warning: input.warning ?? null,
    details: input.details ?? [],
    url: input.url ?? null,
    startedAt: timestamp,
    completedAt:
      input.status === 'completed' || input.status === 'failed' || input.status === 'skipped'
        ? timestamp
        : null,
  });

  const existingIndex = steps.findIndex(
    (step) => resolveProductScanStepIdentity(step) === resolveProductScanStepIdentity(nextStep)
  );
  if (existingIndex < 0) {
    return [...steps, nextStep];
  }

  const existingStep = steps[existingIndex];
  if (!existingStep) {
    return [...steps, nextStep];
  }

  const mergedStep: ProductScanStep = productScanStepSchema.parse({
    ...existingStep,
    ...nextStep,
    startedAt: existingStep.startedAt || nextStep.startedAt,
    durationMs:
      nextStep.completedAt && (existingStep.startedAt || nextStep.startedAt)
        ? Math.max(
            0,
            Date.parse(nextStep.completedAt) -
              Date.parse(existingStep.startedAt || nextStep.startedAt || nextStep.completedAt)
          )
        : nextStep.durationMs,
  });

  return steps.map((step, index) => (index === existingIndex ? mergedStep : step));
};

export const createPersistedProductScanStep = (input: {
  key: string;
  label: string;
  status: ProductScanStep['status'];
  group?: ProductScanStep['group'];
  attempt?: number | null;
  candidateId?: string | null;
  candidateRank?: number | null;
  inputSource?: ProductScanStep['inputSource'];
  retryOf?: string | null;
  resultCode?: string | null;
  message?: string | null;
  warning?: string | null;
  details?: Array<{ label: string; value?: string | null }>;
  url?: string | null;
}): ProductScanStep => {
  const timestamp = new Date().toISOString();
  return normalizePersistedProductScanStep({
    key: input.key,
    label: input.label,
    group: input.group,
    attempt: input.attempt,
    candidateId: input.candidateId ?? null,
    candidateRank: input.candidateRank ?? null,
    inputSource: input.inputSource ?? null,
    retryOf: input.retryOf ?? null,
    resultCode: input.resultCode ?? null,
    status: input.status,
    message: input.message ?? null,
    warning: input.warning ?? null,
    details: input.details ?? [],
    url: input.url ?? null,
    startedAt: timestamp,
    completedAt:
      input.status === 'completed' || input.status === 'failed' || input.status === 'skipped'
        ? timestamp
        : null,
  });
};

export const buildPreparedProductScanSteps = (input: {
  imageCandidateCount: number;
  status: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanStep[] => [
  createPersistedProductScanStep({
    key: 'prepare_scan',
    label: 'Prepare Amazon scan',
    group: 'input',
    status: input.status === 'failed' ? 'failed' : 'completed',
    resultCode: input.status === 'failed' ? 'prepare_failed' : 'prepared',
    message:
      input.status === 'failed'
        ? input.error ?? 'Failed to prepare Amazon reverse image scan.'
        : `Prepared ${input.imageCandidateCount} image candidate${input.imageCandidateCount === 1 ? '' : 's'} for Amazon reverse image scan.`,
    details: [
      {
        label: 'Image candidates',
        value: String(input.imageCandidateCount),
      },
    ],
    url: null,
  }),
];

export const resolveAsinUpdateStepStatus = (
  asinUpdateStatus: ProductScanRecord['asinUpdateStatus']
): ProductScanStep['status'] => {
  if (asinUpdateStatus === 'updated' || asinUpdateStatus === 'unchanged') {
    return 'completed';
  }

  if (asinUpdateStatus === 'not_needed') {
    return 'skipped';
  }

  return 'failed';
};

export const parseAmazonScanScriptResult = (value: unknown): AmazonScanScriptResult => {
  const record = toRecord(value);
  const statusValue = readOptionalString(record?.['status']);
  const status =
    statusValue === 'matched' ||
    statusValue === 'probe_ready' ||
    statusValue === 'no_match' ||
    statusValue === 'failed' ||
    statusValue === 'captcha_required' ||
    statusValue === 'running'
      ? statusValue
      : 'failed';

  return {
    status,
    asin: readOptionalString(record?.['asin'], PRODUCT_SCAN_ASIN_MAX_LENGTH),
    title: readOptionalString(record?.['title'], PRODUCT_SCAN_TITLE_MAX_LENGTH),
    price: readOptionalString(record?.['price'], PRODUCT_SCAN_PRICE_MAX_LENGTH),
    url: readOptionalString(record?.['url'], PRODUCT_SCAN_URL_MAX_LENGTH),
    description: readOptionalString(record?.['description'], PRODUCT_SCAN_DESCRIPTION_MAX_LENGTH),
    amazonDetails: normalizeParsedAmazonDetails(record?.['amazonDetails']),
    amazonProbe: normalizeParsedAmazonProbe(record?.['amazonProbe']),
    matchedImageId: readOptionalString(
      record?.['matchedImageId'],
      PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH
    ),
    message: readOptionalString(record?.['message'], PRODUCT_SCAN_ERROR_MAX_LENGTH),
    currentUrl: readOptionalString(record?.['currentUrl'], PRODUCT_SCAN_URL_MAX_LENGTH),
    stage: readOptionalString(record?.['stage']),
    steps: normalizeParsedProductScanSteps(record?.['steps']),
  };
};

export const buildAmazonScanRequestInput = (input: {
  productId: string;
  productName: string | null;
  existingAsin: string | null | undefined;
  imageCandidates: ProductScanRecord['imageCandidates'];
  batchIndex?: number;
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
  probeOnlyOnAmazonMatch?: boolean;
  directAmazonCandidateUrl?: string | null;
  directMatchedImageId?: string | null;
  directAmazonCandidateRank?: number | null;
}) => ({
  productId: input.productId,
  productName: input.productName,
  existingAsin: input.existingAsin ?? null,
  imageCandidates: input.imageCandidates,
  batchIndex:
    typeof input.batchIndex === 'number' && Number.isFinite(input.batchIndex) && input.batchIndex > 0
      ? Math.trunc(input.batchIndex)
      : 0,
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  probeOnlyOnAmazonMatch: input.probeOnlyOnAmazonMatch === true,
  directAmazonCandidateUrl: readOptionalString(input.directAmazonCandidateUrl, PRODUCT_SCAN_URL_MAX_LENGTH),
  directMatchedImageId: readOptionalString(input.directMatchedImageId, PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH),
  directAmazonCandidateRank:
    typeof input.directAmazonCandidateRank === 'number' &&
    Number.isFinite(input.directAmazonCandidateRank) &&
    input.directAmazonCandidateRank > 0
      ? Math.trunc(input.directAmazonCandidateRank)
      : null,
});

export const createAmazonScanStartedRawResult = (input: {
  runId: string;
  status: string;
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
  previousRunId?: string | null;
  previousResult?: unknown;
  manualVerificationPending?: boolean;
  manualVerificationMessage?: string | null;
}) => ({
  runId: input.runId,
  status: input.status,
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  ...(input.previousRunId ? { previousRunId: input.previousRunId } : {}),
  ...(input.previousResult !== undefined ? { previousResult: input.previousResult } : {}),
  ...(input.manualVerificationPending
    ? {
        manualVerificationPending: true,
        manualVerificationMessage:
          input.manualVerificationMessage ?? PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE,
      }
    : {}),
});

export const createAmazonProductScanBaseRecord = (input: {
  productId: string;
  productName: string;
  userId?: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  status: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanRecord =>
  normalizeProductScanRecord({
    id: randomUUID(),
    productId: input.productId,
    provider: 'amazon',
    scanType: 'google_reverse_image',
    status: input.status,
    productName: input.productName,
    engineRunId: null,
    imageCandidates: input.imageCandidates,
    matchedImageId: null,
    asin: null,
    title: null,
    price: null,
    url: null,
    description: null,
    amazonDetails: null,
    amazonProbe: null,
    amazonEvaluation: null,
    steps: buildPreparedProductScanSteps({
      imageCandidateCount: input.imageCandidates.length,
      status: input.status,
      error: input.error ?? null,
    }),
    rawResult: null,
    error: input.error ?? null,
    asinUpdateStatus: input.status === 'failed' ? 'not_needed' : 'pending',
    asinUpdateMessage: null,
    createdBy: input.userId?.trim() || null,
    updatedBy: input.userId?.trim() || null,
    completedAt: input.status === 'failed' ? new Date().toISOString() : null,
  });

export const createFailedBatchResult = (
  productId: string,
  message: string,
  scanId: string | null = null,
  currentStatus: ProductScanRecord['status'] | null = scanId ? 'failed' : null
): ProductAmazonBatchScanItem => ({
  productId,
  scanId,
  runId: null,
  status: 'failed',
  currentStatus,
  message: readOptionalString(message, PRODUCT_SCAN_BATCH_MESSAGE_MAX_LENGTH),
});

export const buildSynchronizedScanRecord = (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>
): ProductScanRecord =>
  normalizeProductScanRecord({
    ...scan,
    ...updates,
    id: scan.id,
    productId: scan.productId,
  });

export const persistSynchronizedScan = async (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>
): Promise<ProductScanRecord> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS; attempt += 1) {
    try {
      return (
        (await updateProductScan(scan.id, updates)) ?? buildSynchronizedScanRecord(scan, updates)
      );
    } catch (error) {
      lastError = error;
    }
  }

  void ErrorSystem.captureException(lastError, {
    service: 'product-scans.service',
    action: 'persistSynchronizedScan',
    scanId: scan.id,
    productId: scan.productId,
    engineRunId: scan.engineRunId,
  });

  return buildSynchronizedScanRecord(scan, updates);
};

export const persistFailedSynchronization = async (
  scan: ProductScanRecord,
  message: string
): Promise<ProductScanRecord> => {
  const normalizedMessage = normalizeErrorMessage(message, 'Amazon reverse image scan failed.');

  return await persistSynchronizedScan(scan, {
    status: 'failed',
    steps: scan.steps,
    error: normalizedMessage,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: normalizedMessage,
    completedAt: new Date().toISOString(),
  });
};

export const tryDirectQueuedScanUpdate = async (
  scan: ProductScanRecord,
  updates: Partial<ProductScanRecord>,
  context: {
    action: string;
    productId: string;
    runId?: string | null;
  }
): Promise<ProductScanRecord | null> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS; attempt += 1) {
    try {
      const updated = await updateProductScan(scan.id, updates);
      if (updated) {
        return updated;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    void ErrorSystem.captureException(lastError, {
      service: 'product-scans.service',
      action: context.action,
      scanId: scan.id,
      productId: context.productId,
      runId: context.runId ?? null,
    });
  }

  return null;
};
