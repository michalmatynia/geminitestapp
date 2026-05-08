import 'server-only';

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { ImageFileRecord } from '@/shared/contracts/files';
import { getImageFileRepository, uploadFile } from '@/shared/lib/files/services/image-file-service';
import { productsRoot } from '@/shared/lib/files/server-constants';
import type { ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type LocalProductImageFallbackInput = {
  action: string;
  file: File;
  filename: string;
  mimetype?: string | null;
  service: string;
  sku?: string | null;
  sourceUrl?: string | null;
  uploadError: unknown;
};

export type ProductImageUploadWithFallbackInput = {
  action: string;
  file: File;
  filename: string;
  provider?: ProductDbProvider;
  service: string;
  sku?: string | null;
  sourceUrl?: string | null;
};

const sanitizeLocalPathSegment = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const resolveLocalFallbackFilename = (filename: string): string => {
  const extension = path.extname(filename).trim().toLowerCase();
  return `${randomUUID()}${extension.length > 0 ? extension : '.jpg'}`;
};

const resolveLocalFallbackSkuPath = (sku: string | null | undefined): string => {
  const normalized = typeof sku === 'string' ? sanitizeLocalPathSegment(sku) : '';
  return normalized.length > 0 ? normalized : 'uncategorized';
};

const formatUploadError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const normalizeOptionalText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const resolveFallbackMimetype = (
  input: Pick<LocalProductImageFallbackInput, 'file' | 'mimetype'>
): string =>
  normalizeOptionalText(input.mimetype) ?? normalizeOptionalText(input.file.type) ?? 'image/jpeg';

const writeLocalFallbackFile = async (input: {
  file: File;
  filename: string;
  sku?: string | null;
}): Promise<{ filename: string; filepath: string }> => {
  const skuPath = resolveLocalFallbackSkuPath(input.sku);
  const filename = resolveLocalFallbackFilename(input.filename);
  const diskDir = path.join(productsRoot, skuPath);
  const filepath = `/uploads/products/${skuPath}/${filename}`;
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());

  await fs.mkdir(diskDir, { recursive: true });
  await fs.writeFile(path.join(diskDir, filename), fileBuffer);

  return { filename, filepath };
};

export const saveLocalProductImageFileFallback = async (
  input: LocalProductImageFallbackInput
): Promise<ImageFileRecord | null> => {
  try {
    const { filename, filepath } = await writeLocalFallbackFile(input);
    const imageFileRepository = await getImageFileRepository();
    const record = await imageFileRepository.createImageFile({
      filename,
      filepath,
      publicUrl: filepath,
      url: filepath,
      mimetype: resolveFallbackMimetype(input),
      metadata: {
        sourceUrl: input.sourceUrl ?? null,
        storageSource: 'local-fallback',
      },
      size: input.file.size,
      storageProvider: 'local',
    });

    await ErrorSystem.logWarning('Remote product image upload failed; saved local file fallback.', {
      service: input.service,
      action: input.action,
      sku: input.sku ?? null,
      filepath,
      sourceUrl: input.sourceUrl ?? null,
      error: formatUploadError(input.uploadError),
    });

    return record;
  } catch (fallbackError) {
    await ErrorSystem.captureException(fallbackError, {
      service: input.service,
      action: input.action,
      sku: input.sku ?? null,
      sourceUrl: input.sourceUrl ?? null,
    });
    return null;
  }
};

export const uploadProductImageFileWithLocalFallback = async (
  input: ProductImageUploadWithFallbackInput
): Promise<ImageFileRecord> => {
  try {
    return await uploadFile(input.file, {
      category: 'products',
      filenameOverride: input.filename,
      provider: input.provider,
      sku: input.sku ?? undefined,
    });
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: input.service,
      action: input.action,
      sku: input.sku ?? null,
      sourceUrl: input.sourceUrl ?? null,
      filename: input.filename,
    });
    const fallback = await saveLocalProductImageFileFallback({
      action: input.action,
      file: input.file,
      filename: input.filename,
      mimetype: input.file.type,
      service: input.service,
      sku: input.sku,
      sourceUrl: input.sourceUrl,
      uploadError: error,
    });
    if (fallback === null) throw error;
    return fallback;
  }
};
