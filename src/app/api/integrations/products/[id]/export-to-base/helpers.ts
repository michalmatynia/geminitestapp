import { z } from 'zod';

import {
  collectProductImageDiagnostics,
  getProductImagesAsBase64,
  type ImageBase64Mode,
  type ImageExportDiagnostics,
  type ImageTransformOptions,
} from '@/features/integrations/server';
import { ErrorSystem } from '@/features/observability/server';

export const exportSchema = z.object({
  connectionId: z.string().min(1),
  inventoryId: z.string().min(1),
  templateId: z.string().optional(),
  allowDuplicateSku: z.boolean().optional(),
  exportImagesAsBase64: z.boolean().optional(),
  imageBase64Mode: z.enum(['base-only', 'full-data-uri']).optional(),
  imagesOnly: z.boolean().optional(),
  listingId: z.string().optional(),
  externalListingId: z.string().optional(),
  imageTransform: z
    .object({
      forceJpeg: z.boolean().optional(),
      maxDimension: z.number().int().positive().optional(),
      jpegQuality: z.number().int().min(10).max(100).optional(),
    })
    .optional(),
});

const normalizeSearchText = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const isBaseImageError = (message: string | undefined): boolean => {
  if (!message) return false;
  const normalized = normalizeSearchText(message.toLowerCase());
  return (
    normalized.includes('zdjec') ||
    normalized.includes('image') ||
    normalized.includes('photo')
  );
};

export const buildImageDiagnosticsLogger = (
  context: Record<string, unknown>
): ImageExportDiagnostics => ({
  log: (message, data) => {
    void ErrorSystem.logWarning(`[export-to-base][images] ${message}`, {
      ...context,
      ...(data ?? {}),
    });
  },
});

export const logImageDiagnostics = async ({
  product,
  imageBaseUrl,
  includeBase64,
  base64Mode,
  transform,
  context,
}: {
  product: Parameters<typeof collectProductImageDiagnostics>[0];
  imageBaseUrl: string | null;
  includeBase64: boolean;
  base64Mode: ImageBase64Mode;
  transform?: ImageTransformOptions | null;
  context: Record<string, unknown>;
}): Promise<void> => {
  const urlDiagnostics = collectProductImageDiagnostics(product, imageBaseUrl);
  void ErrorSystem.logWarning('[export-to-base][images] Image candidates', {
    ...context,
    images: urlDiagnostics,
  });

  if (!includeBase64) return;

  try {
    const diagnostics = buildImageDiagnosticsLogger(context);
    await getProductImagesAsBase64(product, {
      diagnostics,
      outputMode: base64Mode,
      transform: transform ?? null,
    });
  } catch (error) {
    void ErrorSystem.logWarning(
      '[export-to-base][images] Failed to gather base64 diagnostics',
      {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
};

export const CATEGORY_TEMPLATE_PRODUCT_FIELDS = new Set([
  'categoryid',
  'category_id',
  'category',
]);

export const PRODUCER_ID_TEMPLATE_FIELDS = new Set([
  'producer',
  'producers',
  'producername',
  'producer_name',
  'producernames',
  'producer_names',
  'producerid',
  'producer_id',
  'producerids',
  'producer_ids',
  'manufacturer',
  'manufacturerid',
  'manufacturer_id',
  'manufacturerids',
  'manufacturer_ids',
]);

export const TAG_ID_TEMPLATE_FIELDS = new Set([
  'tagid',
  'tag_id',
  'tagids',
  'tag_ids',
]);

export const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toTemplateFieldKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s_-]+/g, '');

export const matchesTemplateField = (value: string, fields: Set<string>): boolean => {
  const normalized = value.trim().toLowerCase();
  if (fields.has(normalized)) return true;
  const compact = toTemplateFieldKey(normalized);
  return fields.has(compact);
};

export const isMissingExternalEntity = (
  entityName: unknown,
  entityKind: 'category' | 'producer'
): boolean => {
  const normalized = toTrimmedString(entityName).toLowerCase();
  return normalized.startsWith(`[missing external ${entityKind}:`);
};

export const toTimeMs = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const getProducerRefId = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return (
    toTrimmedString(record['producerId']) ||
    toTrimmedString(record['producer_id']) ||
    toTrimmedString(record['id']) ||
    toTrimmedString(record['value'])
  );
};

export const BASE_EXPORT_RUN_PATH_ID = 'integration-base-export';
export const BASE_EXPORT_RUN_PATH_NAME = 'Base.com Export Jobs';
export const BASE_EXPORT_SOURCE = 'integration_base_export';

const EXPORT_REQUEST_LOCK_TTL_MS = 2 * 60_000;
export const inFlightExportRequests = new Map<string, number>();

export const clearExpiredExportRequestLocks = (): void => {
  const now = Date.now();
  for (const [key, createdAt] of inFlightExportRequests.entries()) {
    if (now - createdAt > EXPORT_REQUEST_LOCK_TTL_MS) {
      inFlightExportRequests.delete(key);
    }
  }
};
