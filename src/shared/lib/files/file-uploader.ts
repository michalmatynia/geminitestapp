/**
 * File Uploader Service
 * 
 * Centralized service for processing and managing server-side file uploads.
 * This utility handles the entire file lifecycle, including validation, 
 * optimization, storage provider routing, and database synchronization.
 * 
 * Key Features:
 * - Security: Enforces MIME-type validation and file size limits.
 * - Storage Abstraction: Routes uploads to local storage or external 
 *   cloud backends (e.g., FastComet, CDNs) based on system configuration.
 * - Processing: Supports image optimization pipelines and file sanitization.
 * - Observability: Integrates with the internal error system and generates 
 *   file upload events for tracking.
 * 
 * Usage:
 * This service should be used within API route handlers to process multipart 
 * form data, ensuring all uploads pass through the integrated security and 
 * storage routing logic before persistence.
 */

import 'server-only';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import type { ImageFileCreateInput, ImageFileRecord } from '@/shared/contracts/files';
import type { FileStorageSource } from '@/shared/lib/files/constants';
import type { ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  MAX_IMAGE_BYTES,
  MAX_STUDIO_IMAGE_BYTES,
  ALLOWED_MIME_EXACT,
} from './constants';
import {
  publicRoot,
  uploadsRoot,
} from './server-constants';
import { createFileUploadEvent } from './services/file-upload-events';
import { getImageFileRepository } from './services/image-file-repository';
import {
  deleteFromConfiguredStorage,
  getPublicPathFromStoredPath,
  uploadToConfiguredStorage,
  type FastCometStorageOverrides,
} from './services/storage/file-storage-service';

/**
 * Validates if a MIME type is permitted based on the application's security policy.
 * 
 * @param mime - The MIME type string extracted from the upload
 * @returns true if the MIME type is in the allowed list
 */
function isAllowedMimeType(mime: string | null | undefined): boolean {
  const normalized = (mime ?? '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('image/')) return true;
  return ALLOWED_MIME_EXACT.has(normalized);
}

/**
 * Validates the file extension against a known safe set.
 *
 * @param filename - The original filename provided by the client
 * @returns true if the extension is permitted
 */
function isAllowedFilenameExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp',
    '.avif', '.heic', '.heif', '.tif', '.tiff', '.svg', '.pdf',
  ]).has(ext);
}

export function getDiskPathFromPublicPath(publicPath: string): string {
  const normalized = getPublicPathFromStoredPath(publicPath);
  if (!normalized) {
    throw new Error('Security Error: Invalid file path.');
  }
  if (normalized.startsWith('/uploads/')) {
    const cleaned = normalized.replace(/^\/uploads\/+/, '');
    const resolved = path.resolve(uploadsRoot, cleaned);
    if (!resolved.startsWith(uploadsRoot + path.sep) && resolved !== uploadsRoot) {
      throw new Error('Security Error: Invalid path traversal attempt detected.');
    }
    return resolved;
  }

  const cleaned = normalized.replace(/^\/+/, '');
  const resolved = path.resolve(publicRoot, cleaned);
  if (!resolved.startsWith(publicRoot + path.sep) && resolved !== publicRoot) {
    throw new Error('Security Error: Invalid path traversal attempt detected.');
  }
  return resolved;
}

async function removeEmptyUploadParentDirectory(diskPath: string): Promise<void> {
  const parentDir = path.dirname(diskPath);
  const resolvedParent = path.resolve(parentDir);

  if (resolvedParent === uploadsRoot || !resolvedParent.startsWith(`${uploadsRoot}${path.sep}`)) {
    return;
  }

  await fs.rmdir(resolvedParent).catch((error: unknown) => {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
    if (code === 'ENOENT' || code === 'ENOTEMPTY' || code === 'EEXIST') return;
    void ErrorSystem.captureException(error);
  });
}

import {
  getUploadTarget,
  sanitizeFilename,
} from '@/shared/lib/files/services/upload';

export async function uploadFile(
  file: File,
  options?: {
    category?: 'products' | 'notes' | 'cms' | 'studio' | 'case_resolver' | 'agentcreator' | undefined;
    sku?: string | null | undefined;
    noteId?: string | null | undefined;
    projectId?: string | null | undefined;
    folder?: string | null | undefined;
    allowOrphanRecord?: boolean | undefined;
    filenameOverride?: string | null | undefined;
    forceStorageSource?: FileStorageSource | null | undefined;
    fastCometBaseUrl?: string | null | undefined;
    fastCometConfig?: FastCometStorageOverrides | null | undefined;
    provider?: ProductDbProvider | undefined;
  }
): Promise<ImageFileRecord> {
  const rawName =
    options?.filenameOverride && options.filenameOverride.trim().length > 0
      ? options.filenameOverride
      : typeof file.name === 'string' && file.name.trim().length > 0
        ? file.name
        : 'upload.bin';

  const isStudioUpload = options?.category === 'studio';
  const maxAllowedBytes = isStudioUpload ? MAX_STUDIO_IMAGE_BYTES : MAX_IMAGE_BYTES;

  if (file.size > maxAllowedBytes) {
    throw new Error(`File too large. Max size allowed is ${maxAllowedBytes / 1024 / 1024}MB.`);
  }
  const normalizedType = typeof file.type === 'string' ? file.type.trim().toLowerCase() : '';
  const hasAllowedType = isAllowedMimeType(normalizedType);
  const hasAllowedExt = isAllowedFilenameExtension(rawName);
  const allowStudioFallbackType =
    isStudioUpload && (normalizedType === '' || normalizedType === 'application/octet-stream');
  if (!hasAllowedType && !hasAllowedExt && !allowStudioFallbackType) {
    throw new Error(`Unsupported file type for "${rawName}": ${normalizedType || 'unknown'}`);
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filename = sanitizeFilename(rawName);
  const { diskDir, publicDir } = getUploadTarget({
    category: options?.category,
    sku: options?.sku,
    noteId: options?.noteId,
    projectId: options?.projectId,
    folder: options?.folder,
  });
  const publicPath = `${publicDir}/${filename}`;
  const localDiskPath = path.join(diskDir, filename);
  let storedFilepath = publicPath;
  let storageSource: 'local' | 'fastcomet' = 'local';

  try {
    const storageResult = await uploadToConfiguredStorage({
      buffer: fileBuffer,
      filename,
      mimetype: file.type || 'application/octet-stream',
      publicPath,
      category: options?.category ?? null,
      projectId: options?.projectId ?? null,
      folder: options?.folder ?? null,
      forceSource: options?.forceStorageSource ?? null,
      fastCometBaseUrl: options?.fastCometBaseUrl ?? null,
      fastCometConfig: options?.fastCometConfig ?? null,
      writeLocalCopy: async (): Promise<void> => {
        await fs.mkdir(diskDir, { recursive: true });
        await fs.writeFile(localDiskPath, fileBuffer);
      },
    });
    storedFilepath = storageResult.filepath;
    storageSource = storageResult.source;
    const fastCometPublicBaseUrl =
      options?.fastCometBaseUrl ?? options?.fastCometConfig?.baseUrl ?? null;

    const imageFileRepository = await getImageFileRepository(options?.provider, {
      applicationId: options?.category === 'cms' ? 'cms-builder' : null,
    });
    const recordInput: ImageFileCreateInput = {
      filename,
      filepath: storedFilepath,
      publicUrl: storedFilepath,
      url: storedFilepath,
      mimetype: file.type,
      metadata: {
        publicPath,
        storageSource,
        mirroredLocally: storageResult.mirroredLocally,
        ...(fastCometPublicBaseUrl !== null
          ? { publicBaseUrl: fastCometPublicBaseUrl }
          : {}),
      },
      size: file.size,
      storageProvider: storageSource === 'local' ? 'local' : 'fastcomet',
    };
    const imageFile = await imageFileRepository.createImageFile(recordInput);
    void createFileUploadEvent({
      status: 'success',
      applicationId: options?.category === 'cms' ? 'cms-builder' : null,
      category: options?.category ?? null,
      projectId: options?.projectId ?? null,
      folder: options?.folder ?? null,
      filename,
      filepath: recordInput.filepath,
      mimetype: recordInput.mimetype,
      size: recordInput.size,
      source: 'fileUploader.uploadFile',
      meta: { storageSource },
    }).catch(() => {});

    return imageFile;
  } catch (error) {
    void ErrorSystem.captureException(error);
    void createFileUploadEvent({
      status: 'error',
      applicationId: options?.category === 'cms' ? 'cms-builder' : null,
      category: options?.category ?? null,
      projectId: options?.projectId ?? null,
      folder: options?.folder ?? null,
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: file.type,
      size: file.size,
      source: 'fileUploader.uploadFile',
      errorMessage: error instanceof Error ? error.message : 'Upload failed',
      meta: options?.allowOrphanRecord ? { orphanRecord: true, storageSource } : { storageSource },
    }).catch(() => {});
    await ErrorSystem.captureException(error, {
      service: 'fileUploader',
      action: 'uploadFile',
      filename,
      diskDir,
    });
    if (options?.allowOrphanRecord) {
      const now = new Date();
      return {
        id: randomUUID(),
        filename,
        filepath: storedFilepath,
        mimetype: file.type,
        size: file.size,
        width: null,
        height: null,
        tags: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    }
    throw error;
  }
}

export async function deleteFileFromStorage(filepath: string): Promise<void> {
  await deleteFromConfiguredStorage({
    filepath,
    deleteLocalCopy: async (publicPath: string | null): Promise<void> => {
      if (publicPath === null || publicPath.trim().length === 0) return;
      try {
        const diskPath = getDiskPathFromPublicPath(publicPath);
        await fs.unlink(diskPath).catch(() => {});
        await removeEmptyUploadParentDirectory(diskPath);
      } catch (error) {
        void ErrorSystem.captureException(error);
      }
    },
  });
}
