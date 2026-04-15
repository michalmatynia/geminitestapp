import 'server-only';

import { randomUUID } from 'crypto';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

import {
  DEFAULT_PRODUCT_SCANNER_MANUAL_VERIFICATION_TIMEOUT_MS,
} from '@/features/products/scanner-settings';
import type { ProductScannerAmazonImageSearchProvider } from '@/shared/contracts/products/scanner-settings';
import {
  normalizeProductScanRecord,
  productScanAmazonDetailsSchema,
  productScanAmazonProbeSchema,
  productScanSupplierDetailsSchema,
  productScanSupplierEvaluationSchema,
  productScanSupplierProbeSchema,
  productScanStepDetailSchema,
  productScanStepSchema,
  type ProductScanAmazonDetails,
  type ProductScanAmazonProbe,
  type ProductAmazonBatchScanItem,
  type ProductScanRecord,
  type ProductScanRequestSequenceEntry,
  type ProductScanSupplierDetails,
  type ProductScanSupplierEvaluation,
  type ProductScanSupplierProbe,
  type ProductScanStep,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { resolveProductScanStepGroup as resolveSharedProductScanStepGroup } from '@/shared/lib/browser-execution/product-scan-step-sequencer';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';
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
export const PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH = 120;
export const PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS = 2;
export const PRODUCT_SCAN_MIN_IMAGE_BYTES = 1;
export const PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES = 15 * 1024 * 1024;
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
const PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY = join(tmpdir(), 'geminitestapp-product-scan-images');
const PRODUCT_SCAN_HTTP_URL_PATTERN = /^https?:\/\//i;
const PRODUCT_SCAN_PUBLIC_UPLOADS_PATH_PATTERN = /^\/uploads\//i;

const isLoopbackProductScanHost = (hostname: string): boolean => {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '::1'
  );
};

const resolveLocalPublicPathFromScanImageUrl = (value: unknown): string | null => {
  const normalized = readOptionalString(value);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('/')) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (!isLoopbackProductScanHost(parsed.hostname)) {
      return null;
    }
    return parsed.pathname || null;
  } catch {
    return null;
  }
};

const resolvePublicUploadsFallbackDiskPath = (value: unknown): string | null => {
  const normalized = readOptionalString(value);
  if (!normalized || !PRODUCT_SCAN_PUBLIC_UPLOADS_PATH_PATTERN.test(normalized)) {
    return null;
  }

  const publicUploadsRoot = resolve(process.cwd(), 'public', 'uploads');
  const cleaned = normalized.replace(/^\/uploads\/+/, '');
  const resolved = resolve(publicUploadsRoot, cleaned);
  if (resolved !== publicUploadsRoot && !resolved.startsWith(`${publicUploadsRoot}${sep}`)) {
    return null;
  }

  return resolved;
};

export type AmazonScanScriptResult = {
  status:
    | 'matched'
    | 'probe_ready'
    | 'triage_ready'
    | 'no_match'
    | 'failed'
    | 'captcha_required'
    | 'running';
  asin: string | null;
  title: string | null;
  price: string | null;
  url: string | null;
  description: string | null;
  amazonDetails: ProductScanAmazonDetails;
  amazonProbe: ProductScanAmazonProbe;
  candidateUrls: string[];
  candidateResults: AmazonScanCandidateResult[];
  matchedImageId: string | null;
  message: string | null;
  currentUrl: string | null;
  stage: string | null;
  steps: ProductScanStep[];
};

export type SupplierScanScriptResult = {
  status:
    | 'matched'
    | 'probe_ready'
    | 'no_match'
    | 'failed'
    | 'captcha_required'
    | 'running';
  title: string | null;
  price: string | null;
  url: string | null;
  description: string | null;
  supplierDetails: ProductScanSupplierDetails;
  supplierProbe: ProductScanSupplierProbe;
  supplierEvaluation: ProductScanSupplierEvaluation;
  candidateUrls: string[];
  matchedImageId: string | null;
  message: string | null;
  currentUrl: string | null;
  stage: string | null;
  steps: ProductScanStep[];
};

export type AmazonScanCandidateResult = {
  url: string;
  score: number | null;
  asin: string | null;
  marketplaceDomain: string | null;
  title: string | null;
  snippet: string | null;
  rank: number | null;
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

const normalizeProductScanSequenceGroup = (
  value: unknown
): ProductScanStep['group'] =>
  value === 'input' ||
  value === 'google_lens' ||
  value === 'amazon' ||
  value === 'supplier' ||
  value === 'product'
    ? value
    : null;

export const normalizeProductScanRequestSequence = (
  value: unknown
): ProductScanRequestSequenceEntry[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .map((entry) => {
      const normalizedEntry = readOptionalString(entry, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH);
      if (normalizedEntry) {
        return normalizedEntry;
      }

      const record = toRecord(entry);
      const key = readOptionalString(record?.['key'], PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH);
      if (!key) {
        return null;
      }

      const label = readOptionalString(record?.['label'], 160);
      const group = normalizeProductScanSequenceGroup(record?.['group']);

      if (!label && !group) {
        return key;
      }

      return {
        key,
        ...(label ? { label } : {}),
        ...(group ? { group } : {}),
      } satisfies ProductScanRequestSequenceEntry;
    })
    .filter((entry): entry is ProductScanRequestSequenceEntry => entry != null)
    .slice(0, 50);

  return normalized.length > 0 ? normalized : null;
};

export const resolveProductScanRequestSequenceInput = (
  value: unknown
): {
  stepSequenceKey?: string;
  stepSequence?: ProductScanRequestSequenceEntry[];
} => {
  const record = toRecord(value);
  const stepSequenceKey = readOptionalString(
    record?.['stepSequenceKey'],
    PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH
  );
  const stepSequence = normalizeProductScanRequestSequence(record?.['stepSequence']);

  return {
    ...(stepSequenceKey ? { stepSequenceKey } : {}),
    ...(stepSequence ? { stepSequence } : {}),
  };
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
  return Boolean(await resolveLocalScanImageCandidatePath(candidate));
};

export const resolveLocalScanImageCandidatePath = async (
  candidate: Pick<ProductScanRecord['imageCandidates'][number], 'filepath' | 'filename'>
): Promise<string | null> => {
  const normalizedFilepath = readOptionalString(candidate.filepath);
  if (!normalizedFilepath) {
    return null;
  }
  if (!hasSupportedLocalScanImageExtension(candidate)) {
    return null;
  }

  const diskPathCandidates = [normalizedFilepath];
  if (normalizedFilepath.startsWith('/')) {
    try {
      const publicDiskPath = getDiskPathFromPublicPath(normalizedFilepath);
      if (publicDiskPath && !diskPathCandidates.includes(publicDiskPath)) {
        diskPathCandidates.push(publicDiskPath);
      }
    } catch {
      // Ignore path-conversion failures and fall back to the raw filepath only.
    }

    const publicUploadsFallbackPath = resolvePublicUploadsFallbackDiskPath(normalizedFilepath);
    if (
      publicUploadsFallbackPath &&
      !diskPathCandidates.includes(publicUploadsFallbackPath)
    ) {
      diskPathCandidates.push(publicUploadsFallbackPath);
    }
  } else if (!PRODUCT_SCAN_HTTP_URL_PATTERN.test(normalizedFilepath)) {
    try {
      const publicDiskPath = getDiskPathFromPublicPath(`/${normalizedFilepath}`);
      if (publicDiskPath && !diskPathCandidates.includes(publicDiskPath)) {
        diskPathCandidates.push(publicDiskPath);
      }
    } catch {
      // Ignore path-conversion failures and fall back to the raw filepath only.
    }
  }

  for (const diskPath of diskPathCandidates) {
    try {
      const fileStats = await nodeFs.stat(diskPath);
      if (fileStats.isFile() && fileStats.size >= PRODUCT_SCAN_MIN_IMAGE_BYTES) {
        return diskPath;
      }
    } catch {
      // Try the next disk path candidate.
    }
  }

  return null;
};

const resolveLocalScanImageCandidateUrlPath = async (
  candidate: Pick<ProductScanRecord['imageCandidates'][number], 'url' | 'filename'>
): Promise<string | null> => {
  const publicPath = resolveLocalPublicPathFromScanImageUrl(candidate.url);
  if (!publicPath) {
    return null;
  }

  return await resolveLocalScanImageCandidatePath({
    filepath: publicPath,
    filename: candidate.filename,
  });
};

export const sanitizeProductScanImageCandidates = async (
  imageCandidates: ProductScanRecord['imageCandidates'],
  options: { materializeUrlCandidates?: boolean; requireLocalFile?: boolean } = {}
): Promise<ProductScanRecord['imageCandidates']> => {
  const sanitizedCandidates = await Promise.all(
    imageCandidates.map(async (candidate) => {
      const resolvedFilepath = await resolveLocalScanImageCandidatePath(candidate);
      const hasUrl = Boolean(readOptionalString(candidate.url));

      if (resolvedFilepath) {
        return {
          ...candidate,
          filepath: resolvedFilepath,
        };
      }

      if (!hasUrl) {
        return null;
      }

      const localUrlFilepath = await resolveLocalScanImageCandidateUrlPath(candidate);
      if (localUrlFilepath) {
        return {
          ...candidate,
          filepath: localUrlFilepath,
        };
      }

      if (options.materializeUrlCandidates) {
        try {
          const materializedCandidate = await materializeProductScanUrlCandidate(candidate);
          if (materializedCandidate) {
            return materializedCandidate;
          }
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: 'product-scans.service',
            action: 'sanitizeProductScanImageCandidates.materializeUrlCandidate',
            candidateId: candidate.id,
          });
        }
      }

      if (options.requireLocalFile) {
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

const normalizeProductScanDataUrl = (value: unknown): string | null => {
  const normalized = readOptionalString(value);
  if (!normalized) {
    return null;
  }
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(normalized) ? normalized : null;
};

const collectProductScanBase64Slots = (
  product: Pick<ProductWithImages, 'imageBase64s' | 'imageLinks'>
): string[] => {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const entry of Array.isArray(product.imageBase64s) ? product.imageBase64s : []) {
    const normalized = normalizeProductScanDataUrl(entry);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      values.push(normalized);
    }
  }
  for (const entry of Array.isArray(product.imageLinks) ? product.imageLinks : []) {
    const normalized = normalizeProductScanDataUrl(entry);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      values.push(normalized);
    }
  }
  return values;
};

const resolveProductScanBase64ImageExtension = (mimeType: string): string => {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  if (normalized === 'image/gif') return '.gif';
  if (normalized === 'image/bmp') return '.bmp';
  if (normalized === 'image/tiff') return '.tiff';
  if (normalized === 'image/avif') return '.avif';
  if (normalized === 'image/heic') return '.heic';
  if (normalized === 'image/heif') return '.heif';
  return '.jpg';
};

const resolveProductScanUrlImageExtension = (input: {
  contentType?: string | null;
  filename?: string | null;
  url?: string | null;
}): string => {
  if (input.contentType) {
    return resolveProductScanBase64ImageExtension(input.contentType);
  }

  const extensionSource = readOptionalString(input.filename) ?? readOptionalString(input.url);
  if (!extensionSource) {
    return '.jpg';
  }

  const extension = extname(extensionSource.split('?')[0] ?? '').toLowerCase();
  return PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS.has(extension) ? extension : '.jpg';
};

const writeProductScanTempImageCandidate = async (input: {
  id: string | null;
  filename: string | null;
  buffer: Buffer;
  mimeType?: string | null;
  sourceUrl?: string | null;
  productId?: string | null;
  slotIndex?: number | null;
}): Promise<ProductScanRecord['imageCandidates'][number] | null> => {
  if (
    input.buffer.byteLength < PRODUCT_SCAN_MIN_IMAGE_BYTES ||
    input.buffer.byteLength > PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES
  ) {
    return null;
  }

  const extension = resolveProductScanUrlImageExtension({
    contentType: input.mimeType,
    filename: input.filename,
    url: input.sourceUrl,
  });
  const safeProductId =
    readOptionalString(input.productId)?.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) ||
    'product';
  const slotLabel =
    typeof input.slotIndex === 'number' && Number.isFinite(input.slotIndex)
      ? `slot-${input.slotIndex + 1}`
      : 'remote';
  const filename =
    readOptionalString(input.filename) ?? `${safeProductId}-scan-${slotLabel}${extension}`;
  const filepath = join(
    PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY,
    `${safeProductId}-${slotLabel}-${randomUUID()}${extension}`
  );

  await nodeFs.mkdir(PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY, { recursive: true });
  await nodeFs.writeFile(filepath, input.buffer);

  return {
    id: input.id,
    filepath,
    url: readOptionalString(input.sourceUrl),
    filename,
  };
};

const materializeProductScanBase64Candidate = async (input: {
  productId: string;
  slotIndex: number;
  dataUrl: string;
}): Promise<ProductScanRecord['imageCandidates'][number] | null> => {
  const match = input.dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) {
    return null;
  }

  const mimeType = match[1]?.toLowerCase() ?? 'image/jpeg';
  const encoded = match[2] ?? '';
  let buffer: Buffer;
  try {
    buffer = Buffer.from(encoded, 'base64');
  } catch {
    return null;
  }
  return await writeProductScanTempImageCandidate({
    id: `base64-slot-${input.slotIndex + 1}`,
    filename: null,
    buffer,
    mimeType,
    sourceUrl: null,
    productId: input.productId,
    slotIndex: input.slotIndex,
  });
};

const materializeProductScanUrlCandidate = async (
  candidate: ProductScanRecord['imageCandidates'][number]
): Promise<ProductScanRecord['imageCandidates'][number] | null> => {
  const url = readOptionalString(candidate.url);
  if (!url || !PRODUCT_SCAN_HTTP_URL_PATTERN.test(url)) {
    return null;
  }

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const contentLength = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(contentLength) && contentLength > PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && !/^image\//i.test(contentType)) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return await writeProductScanTempImageCandidate({
    id: candidate.id,
    filename: candidate.filename,
    buffer,
    mimeType: contentType,
    sourceUrl: url,
  });
};

export const hydrateProductScanImageCandidates = async (input: {
  product: Pick<ProductWithImages, 'id' | 'imageBase64s' | 'imageLinks'>;
  imageCandidates: ProductScanRecord['imageCandidates'];
  limit?: number;
}): Promise<ProductScanRecord['imageCandidates']> => {
  const limit =
    typeof input.limit === 'number' && Number.isFinite(input.limit) && input.limit > 0
      ? Math.trunc(input.limit)
      : input.imageCandidates.length || 3;
  const nextCandidates = input.imageCandidates.slice(0, limit);
  if (nextCandidates.length >= limit) {
    return nextCandidates;
  }

  const base64Slots = collectProductScanBase64Slots(input.product);
  if (base64Slots.length === 0) {
    return nextCandidates;
  }

  for (const [slotIndex, dataUrl] of base64Slots.entries()) {
    if (nextCandidates.length >= limit) {
      break;
    }

    try {
      const candidate = await materializeProductScanBase64Candidate({
        productId: input.product.id,
        slotIndex,
        dataUrl,
      });
      if (candidate) {
        nextCandidates.push(candidate);
      }
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'hydrateProductScanImageCandidates',
        productId: input.product.id,
        slotIndex,
      });
    }
  }

  return nextCandidates.slice(0, limit);
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
    .map((entry) => {
      const record = toRecord(entry);
      if (!record) {
        return null;
      }

      return productScanStepSchema.safeParse({
        ...record,
        details: normalizeProductScanStepDetails(
          record['details'] as Array<{ label: string; value?: string | null }> | null | undefined
        ),
      });
    })
    .filter((entry): entry is ReturnType<typeof productScanStepSchema.safeParse> => Boolean(entry))
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

export const normalizeParsedSupplierDetails = (value: unknown): ProductScanSupplierDetails => {
  const parsed = productScanSupplierDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const normalizeParsedSupplierProbe = (value: unknown): ProductScanSupplierProbe => {
  const parsed = productScanSupplierProbeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const normalizeParsedSupplierEvaluation = (
  value: unknown
): ProductScanSupplierEvaluation => {
  const parsed = productScanSupplierEvaluationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const normalizeParsedCandidateUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of value) {
    const next = readOptionalString(entry, PRODUCT_SCAN_URL_MAX_LENGTH);
    if (!next || seen.has(next)) {
      continue;
    }
    seen.add(next);
    normalized.push(next);
  }

  return normalized;
};

export const normalizeParsedAmazonCandidateResults = (
  value: unknown
): AmazonScanCandidateResult[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: AmazonScanCandidateResult[] = [];
  for (const entry of value) {
    const record = toRecord(entry);
    const url = readOptionalString(record?.['url'], PRODUCT_SCAN_URL_MAX_LENGTH);
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    normalized.push({
      url,
      score:
        typeof record?.['score'] === 'number' && Number.isFinite(record['score'])
          ? Math.trunc(record['score'])
          : null,
      asin: readOptionalString(record?.['asin'], PRODUCT_SCAN_ASIN_MAX_LENGTH),
      marketplaceDomain: readOptionalString(record?.['marketplaceDomain'], 200),
      title: readOptionalString(record?.['title'], PRODUCT_SCAN_TITLE_MAX_LENGTH),
      snippet: readOptionalString(record?.['snippet'], PRODUCT_SCAN_DESCRIPTION_MAX_LENGTH),
      rank:
        typeof record?.['rank'] === 'number' && Number.isFinite(record['rank']) && record['rank'] > 0
          ? Math.trunc(record['rank'])
          : null,
    });
  }

  return normalized;
};

const resolveComparableStepAttempt = (attempt: number | null | undefined): number =>
  typeof attempt === 'number' && Number.isFinite(attempt) && attempt > 0 ? Math.trunc(attempt) : 1;

export const resolveProductScanStepGroup = (
  key: string | null | undefined
): ProductScanStep['group'] =>
  resolveSharedProductScanStepGroup(readOptionalString(key));

const normalizeProductScanStepDetails = (
  value: Array<{ label: string; value?: string | null }> | null | undefined
): ProductScanStep['details'] =>
  (Array.isArray(value) ? value : [])
    .slice(0, 20)
    .map((entry) =>
      productScanStepDetailSchema.safeParse({
        label: entry.label,
        value: entry.value ?? null,
      })
    )
    .filter((entry) => entry.success)
    .map((entry) => entry.data);

const resolveProductScanStepIdentity = (
  step: Pick<ProductScanStep, 'key' | 'attempt' | 'inputSource' | 'candidateId'>
): string =>
  `${step.key}::${resolveComparableStepAttempt(step.attempt)}::${readOptionalString(step.inputSource) ?? 'none'}::${readOptionalString(step.candidateId) ?? 'none'}`;

const normalizePersistedProductScanStep = (
  input: Omit<Partial<ProductScanStep>, 'details'> &
    Pick<ProductScanStep, 'key' | 'label' | 'status'> & {
      details?: Array<{ label: string; value?: string | null }>;
    }
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
  prepareLabel?: string;
  summaryLabel?: string;
  imageCandidateCount: number;
  status: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanStep[] => [
  createPersistedProductScanStep({
    key: 'prepare_scan',
    label: `Prepare ${input.prepareLabel ?? 'Amazon'} scan`,
    group: 'input',
    status: input.status === 'failed' ? 'failed' : 'completed',
    resultCode: input.status === 'failed' ? 'prepare_failed' : 'prepared',
    message:
      input.status === 'failed'
        ? input.error ?? `Failed to prepare ${input.summaryLabel ?? 'Amazon reverse image'} scan.`
        : `Prepared ${input.imageCandidateCount} image candidate${input.imageCandidateCount === 1 ? '' : 's'} for ${input.summaryLabel ?? 'Amazon reverse image'} scan.`,
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
    statusValue === 'triage_ready' ||
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
    candidateUrls: normalizeParsedCandidateUrls(record?.['candidateUrls']),
    candidateResults: normalizeParsedAmazonCandidateResults(record?.['candidateResults']),
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

export const parse1688ScanScriptResult = (value: unknown): SupplierScanScriptResult => {
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
    title: readOptionalString(record?.['title'], PRODUCT_SCAN_TITLE_MAX_LENGTH),
    price: readOptionalString(record?.['price'], PRODUCT_SCAN_PRICE_MAX_LENGTH),
    url: readOptionalString(record?.['url'], PRODUCT_SCAN_URL_MAX_LENGTH),
    description: readOptionalString(record?.['description'], PRODUCT_SCAN_DESCRIPTION_MAX_LENGTH),
    supplierDetails: normalizeParsedSupplierDetails(record?.['supplierDetails']),
    supplierProbe: normalizeParsedSupplierProbe(record?.['supplierProbe']),
    supplierEvaluation: normalizeParsedSupplierEvaluation(record?.['supplierEvaluation']),
    candidateUrls: normalizeParsedCandidateUrls(record?.['candidateUrls']),
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
  imageSearchProvider?: ProductScannerAmazonImageSearchProvider | null;
  batchIndex?: number;
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
  triageOnlyOnAmazonCandidates?: boolean;
  probeOnlyOnAmazonMatch?: boolean;
  skipAmazonProbe?: boolean;
  directAmazonCandidateUrl?: string | null;
  directAmazonCandidateUrls?: string[] | null;
  directMatchedImageId?: string | null;
  directAmazonCandidateRank?: number | null;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanRequestSequenceEntry[] | null;
}) => ({
  productId: input.productId,
  productName: input.productName,
  existingAsin: input.existingAsin ?? null,
  imageCandidates: input.imageCandidates,
  imageSearchProvider:
    input.imageSearchProvider === 'google_images_url' ||
    input.imageSearchProvider === 'google_lens_upload'
      ? input.imageSearchProvider
      : 'google_images_upload',
  batchIndex:
    typeof input.batchIndex === 'number' && Number.isFinite(input.batchIndex) && input.batchIndex > 0
      ? Math.trunc(input.batchIndex)
      : 0,
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  triageOnlyOnAmazonCandidates: input.triageOnlyOnAmazonCandidates === true,
  probeOnlyOnAmazonMatch: input.probeOnlyOnAmazonMatch === true,
  skipAmazonProbe: input.skipAmazonProbe === true,
  directAmazonCandidateUrl: readOptionalString(input.directAmazonCandidateUrl, PRODUCT_SCAN_URL_MAX_LENGTH),
  directAmazonCandidateUrls: normalizeParsedCandidateUrls(input.directAmazonCandidateUrls),
  directMatchedImageId: readOptionalString(input.directMatchedImageId, PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH),
  directAmazonCandidateRank:
    typeof input.directAmazonCandidateRank === 'number' &&
    Number.isFinite(input.directAmazonCandidateRank) &&
    input.directAmazonCandidateRank > 0
      ? Math.trunc(input.directAmazonCandidateRank)
      : null,
  stepSequenceKey: readOptionalString(input.stepSequenceKey, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH),
  stepSequence: normalizeProductScanRequestSequence(input.stepSequence),
});

export const build1688ScanRequestInput = (input: {
  productId: string;
  productName: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  integrationId?: string | null;
  connectionId?: string | null;
  scanner1688StartUrl?: string | null;
  scanner1688LoginMode?: 'session_required' | 'manual_login' | null;
  scanner1688DefaultSearchMode?: 'local_image' | 'image_url_fallback' | null;
  batchIndex?: number;
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
  candidateResultLimit?: number | null;
  minimumCandidateScore?: number | null;
  maxExtractedImages?: number | null;
  allowUrlImageSearchFallback?: boolean | null;
  directSupplierCandidateUrl?: string | null;
  directSupplierCandidateUrls?: string[] | null;
  directMatchedImageId?: string | null;
  directSupplierCandidateRank?: number | null;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanRequestSequenceEntry[] | null;
}) => ({
  productId: input.productId,
  productName: input.productName,
  imageCandidates: input.imageCandidates,
  integrationId: readOptionalString(input.integrationId, 160),
  connectionId: readOptionalString(input.connectionId, 160),
  scanner1688StartUrl: readOptionalString(input.scanner1688StartUrl, PRODUCT_SCAN_URL_MAX_LENGTH),
  scanner1688LoginMode:
    input.scanner1688LoginMode === 'manual_login' ? 'manual_login' : 'session_required',
  scanner1688DefaultSearchMode:
    input.scanner1688DefaultSearchMode === 'image_url_fallback'
      ? 'image_url_fallback'
      : 'local_image',
  batchIndex:
    typeof input.batchIndex === 'number' && Number.isFinite(input.batchIndex) && input.batchIndex > 0
      ? Math.trunc(input.batchIndex)
      : 0,
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  candidateResultLimit:
    typeof input.candidateResultLimit === 'number' &&
    Number.isFinite(input.candidateResultLimit) &&
    input.candidateResultLimit > 0
      ? Math.trunc(input.candidateResultLimit)
      : null,
  minimumCandidateScore:
    typeof input.minimumCandidateScore === 'number' &&
    Number.isFinite(input.minimumCandidateScore) &&
    input.minimumCandidateScore > 0
      ? Math.trunc(input.minimumCandidateScore)
      : null,
  maxExtractedImages:
    typeof input.maxExtractedImages === 'number' &&
    Number.isFinite(input.maxExtractedImages) &&
    input.maxExtractedImages > 0
      ? Math.trunc(input.maxExtractedImages)
      : null,
  allowUrlImageSearchFallback: input.allowUrlImageSearchFallback !== false,
  directSupplierCandidateUrl: readOptionalString(
    input.directSupplierCandidateUrl,
    PRODUCT_SCAN_URL_MAX_LENGTH
  ),
  directSupplierCandidateUrls: normalizeParsedCandidateUrls(input.directSupplierCandidateUrls),
  directMatchedImageId: readOptionalString(
    input.directMatchedImageId,
    PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH
  ),
  directSupplierCandidateRank:
    typeof input.directSupplierCandidateRank === 'number' &&
    Number.isFinite(input.directSupplierCandidateRank) &&
    input.directSupplierCandidateRank > 0
      ? Math.trunc(input.directSupplierCandidateRank)
      : null,
  stepSequenceKey: readOptionalString(input.stepSequenceKey, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH),
  stepSequence: normalizeProductScanRequestSequence(input.stepSequence),
});

export const createAmazonScanStartedRawResult = (input: {
  runId: string;
  status: string;
  imageSearchProvider: ProductScannerAmazonImageSearchProvider;
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
  imageSearchProviderHistory?: ProductScannerAmazonImageSearchProvider[] | null;
  previousRunId?: string | null;
  previousResult?: unknown;
  manualVerificationPending?: boolean;
  manualVerificationMessage?: string | null;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanRequestSequenceEntry[] | null;
}) => ({
  runId: input.runId,
  status: input.status,
  imageSearchProvider:
    input.imageSearchProvider === 'google_images_url' ||
    input.imageSearchProvider === 'google_lens_upload'
      ? input.imageSearchProvider
      : 'google_images_upload',
  imageSearchProviderHistory:
    Array.isArray(input.imageSearchProviderHistory) && input.imageSearchProviderHistory.length > 0
      ? Array.from(
          new Set(
            input.imageSearchProviderHistory.filter(
              (value): value is ProductScannerAmazonImageSearchProvider =>
                value === 'google_images_upload' ||
                value === 'google_images_url' ||
                value === 'google_lens_upload'
            )
          )
        )
      : [
          input.imageSearchProvider === 'google_images_url' ||
          input.imageSearchProvider === 'google_lens_upload'
            ? input.imageSearchProvider
            : 'google_images_upload',
        ],
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  ...(readOptionalString(input.stepSequenceKey, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH)
    ? {
        stepSequenceKey: readOptionalString(
          input.stepSequenceKey,
          PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH
        ),
      }
    : {}),
  ...(normalizeProductScanRequestSequence(input.stepSequence)
    ? { stepSequence: normalizeProductScanRequestSequence(input.stepSequence) }
    : {}),
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
  integrationId?: string | null;
  connectionId?: string | null;
  userId?: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  status: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanRecord =>
  normalizeProductScanRecord({
    id: randomUUID(),
    productId: input.productId,
    integrationId: readOptionalString(input.integrationId, 160),
    connectionId: readOptionalString(input.connectionId, 160),
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
      prepareLabel: 'Amazon',
      summaryLabel: 'Amazon reverse image',
      imageCandidateCount: input.imageCandidates.length,
      status: input.status,
      error: input.error ?? null,
    }),
    rawResult: null,
    error: input.error ?? null,
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: null,
    createdBy: input.userId?.trim() || null,
    updatedBy: input.userId?.trim() || null,
    completedAt: input.status === 'failed' ? new Date().toISOString() : null,
  });

export const create1688ProductScanBaseRecord = (input: {
  productId: string;
  productName: string;
  integrationId?: string | null;
  connectionId?: string | null;
  userId?: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  status: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanRecord =>
  normalizeProductScanRecord({
    id: randomUUID(),
    productId: input.productId,
    integrationId: readOptionalString(input.integrationId, 160),
    connectionId: readOptionalString(input.connectionId, 160),
    provider: '1688',
    scanType: 'supplier_reverse_image',
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
    supplierDetails: null,
    supplierProbe: null,
    supplierEvaluation: null,
    steps: buildPreparedProductScanSteps({
      prepareLabel: '1688 supplier',
      summaryLabel: '1688 supplier reverse image',
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
  message: string,
  fallbackMessage = 'Amazon reverse image scan failed.'
): Promise<ProductScanRecord> => {
  const normalizedMessage = normalizeErrorMessage(message, fallbackMessage);

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

export * from './product-scans-service.helpers.amazon';
