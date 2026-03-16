import 'server-only';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ProductDbProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  tempFolderName,
  MAX_IMAGE_BYTES,
  MAX_STUDIO_IMAGE_BYTES,
  ALLOWED_MIME_EXACT,
} from './constants';
import {
  agentCreatorRoot,
  caseResolverRoot,
  notesRoot,
  productsRoot,
  publicRoot,
  studioRoot,
  uploadsRoot,
} from './server-constants';
import { createFileUploadEvent } from './services/file-upload-events';
import { getImageFileRepository } from './services/image-file-repository';
import {
  deleteFromConfiguredStorage,
  getPublicPathFromStoredPath,
  uploadToConfiguredStorage,
} from './services/storage/file-storage-service';


function isAllowedMimeType(mime: string | null | undefined): boolean {
  const normalized = (mime ?? '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('image/')) return true;
  return ALLOWED_MIME_EXACT.has(normalized);
}

function isAllowedFilenameExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.bmp',
    '.avif',
    '.heic',
    '.heif',
    '.tif',
    '.tiff',
    '.svg',
    '.pdf',
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

function sanitizeSku(sku: string): string {
  return sku.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

function sanitizeSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

function sanitizeFolderPath(value: string): string {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part: string) => part.trim())
    .filter((part: string) => part && part !== '.' && part !== '..')
    .map((part: string) => part.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);

  return parts.join('/');
}

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return `${randomUUID()}${ext}`;
}

function getUploadTarget({
  category,
  sku,
  noteId,
  projectId,
  folder,
}: {
  category?:
    | 'products'
    | 'notes'
    | 'cms'
    | 'studio'
    | 'case_resolver'
    | 'agentcreator'
    | undefined;
  sku?: string | null | undefined;
  noteId?: string | null | undefined;
  projectId?: string | null | undefined;
  folder?: string | null | undefined;
}): { diskDir: string; publicDir: string } {
  if (category === 'products') {
    const folderName = sku ? sanitizeSku(sku) : tempFolderName;
    const diskDir = path.join(productsRoot, folderName);
    const publicDir = `/uploads/products/${folderName}`;
    return { diskDir, publicDir };
  }

  if (category === 'notes' && noteId) {
    const diskDir = path.join(notesRoot, noteId);
    const publicDir = `/uploads/notes/${noteId}`;
    return { diskDir, publicDir };
  }

  if (category === 'cms') {
    const diskDir = path.join(uploadsRoot, 'cms');
    const publicDir = '/uploads/cms';
    return { diskDir, publicDir };
  }

  if (category === 'studio') {
    if (!projectId) {
      throw new Error('projectId is required for studio uploads.');
    }
    const safeProject = sanitizeSegment(projectId);
    const safeFolder = folder?.trim() ? sanitizeFolderPath(folder) : '';
    const diskDir = safeFolder
      ? path.join(studioRoot, safeProject, safeFolder)
      : path.join(studioRoot, safeProject);
    const publicDir = safeFolder
      ? `/uploads/studio/${safeProject}/${safeFolder}`
      : `/uploads/studio/${safeProject}`;
    return { diskDir, publicDir };
  }

  if (category === 'case_resolver') {
    const safeFolder = folder?.trim() ? sanitizeFolderPath(folder) : '';
    const diskDir = safeFolder ? path.join(caseResolverRoot, safeFolder) : caseResolverRoot;
    const publicDir = safeFolder
      ? `/uploads/case-resolver/${safeFolder}`
      : '/uploads/case-resolver';
    return { diskDir, publicDir };
  }

  if (category === 'agentcreator') {
    const safeFolder = folder?.trim() ? sanitizeFolderPath(folder) : '';
    const diskDir = safeFolder ? path.join(agentCreatorRoot, safeFolder) : agentCreatorRoot;
    const publicDir = safeFolder
      ? `/uploads/agentcreator/${safeFolder}`
      : '/uploads/agentcreator';
    return { diskDir, publicDir };
  }

  return { diskDir: uploadsRoot, publicDir: '/uploads' };
}

export async function uploadFile(
  file: File,
  options?: {
    category?:
      | 'products'
      | 'notes'
      | 'cms'
      | 'studio'
      | 'case_resolver'
      | 'agentcreator'
      | undefined;
    sku?: string | null | undefined;
    noteId?: string | null | undefined;
    projectId?: string | null | undefined;
    folder?: string | null | undefined;
    allowOrphanRecord?: boolean | undefined;
    filenameOverride?: string | null | undefined;
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
      writeLocalCopy: async (): Promise<void> => {
        await fs.mkdir(diskDir, { recursive: true });
        await fs.writeFile(localDiskPath, fileBuffer);
      },
    });
    storedFilepath = storageResult.filepath;
    storageSource = storageResult.source;

    const imageFileRepository = await getImageFileRepository(options?.provider);
    const recordInput = {
      filename,
      filepath: storedFilepath,
      mimetype: file.type,
      size: file.size,
    };
    const imageFile = await imageFileRepository.createImageFile(recordInput);
    void createFileUploadEvent({
      status: 'success',
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
      if (!publicPath) return;
      try {
        const diskPath = getDiskPathFromPublicPath(publicPath);
        await fs.unlink(diskPath).catch(() => {});
      } catch (error) {
        void ErrorSystem.captureException(error);
      
        // ignore invalid or non-local paths
      }
    },
  });
}
