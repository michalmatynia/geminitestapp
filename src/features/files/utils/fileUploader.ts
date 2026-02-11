import 'server-only';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { createFileUploadEvent } from '@/features/files/services/file-upload-events';
import { getImageFileRepository } from '@/features/files/services/image-file-repository';
import type { ImageFileRecord } from '@/features/files/types/services/image-file-repository';
import { noteService } from '@/features/notesapp/server';
import { ErrorSystem } from '@/features/observability/server';
import type { NoteFileRecord } from '@/shared/types/domain/notes';


const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
const productsRoot = path.join(uploadsRoot, 'products');
const notesRoot = path.join(uploadsRoot, 'notes');
const studioRoot = path.join(uploadsRoot, 'studio');
const tempFolderName = 'temp';

const publicRoot = path.resolve(process.cwd(), 'public');
const MAX_IMAGE_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_STUDIO_IMAGE_BYTES = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_EXACT = new Set(['application/pdf', 'application/octet-stream']);

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
  const cleaned = publicPath.replace(/^\/+/, '');
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
  category?: 'products' | 'notes' | 'cms' | 'studio' | undefined;
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

  return { diskDir: uploadsRoot, publicDir: '/uploads' };
}

export async function uploadFile(
  file: File,
  options?: {
    category?: 'products' | 'notes' | 'cms' | 'studio' | undefined;
    sku?: string | null | undefined;
    noteId?: string | null | undefined;
    projectId?: string | null | undefined;
    folder?: string | null | undefined;
    allowOrphanRecord?: boolean | undefined;
    filenameOverride?: string | null | undefined;
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
  const allowStudioFallbackType = isStudioUpload && (normalizedType === '' || normalizedType === 'application/octet-stream');
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
  const filepath = path.join(diskDir, filename);

  try {
    await fs.mkdir(diskDir, { recursive: true });
    await fs.writeFile(filepath, fileBuffer);

    const imageFileRepository = await getImageFileRepository();
    const recordInput = {
      filename,
      filepath: `${publicDir}/${filename}`,
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
    }).catch(() => {});

    return imageFile;
  } catch (error) {
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
      meta: options?.allowOrphanRecord ? { orphanRecord: true } : null,
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
        filepath: `${publicDir}/${filename}`,
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

export async function uploadNoteFile(
  file: File,
  noteId: string,
  slotIndex: number
): Promise<NoteFileRecord> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`File too large. Max size allowed is ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`);
  }
  if (!isAllowedMimeType(file.type) && !isAllowedFilenameExtension(file.name)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filename = `slot-${slotIndex}-${sanitizeFilename(file.name)}`;
  const diskDir = path.join(notesRoot, noteId);
  const publicDir = `/uploads/notes/${noteId}`;
  const filepath = path.join(diskDir, filename);

  try {
    await fs.mkdir(diskDir, { recursive: true });
    await fs.writeFile(filepath, fileBuffer);

    const noteFile = await noteService.createNoteFile({
      noteId,
      slotIndex,
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: file.type,
      size: file.size,
    });
    void createFileUploadEvent({
      status: 'success',
      category: 'notes',
      projectId: noteId,
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: file.type,
      size: file.size,
      source: 'fileUploader.uploadNoteFile',
    }).catch(() => {});

    return noteFile;
  } catch (error) {
    void createFileUploadEvent({
      status: 'error',
      category: 'notes',
      projectId: noteId,
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: file.type,
      size: file.size,
      source: 'fileUploader.uploadNoteFile',
      errorMessage: error instanceof Error ? error.message : 'Upload failed',
    }).catch(() => {});
    await ErrorSystem.captureException(error, {
      service: 'fileUploader',
      action: 'uploadNoteFile',
      filename,
      noteId,
    });
    throw error;
  }
}

export async function deleteNoteFile(
  noteId: string,
  slotIndex: number,
  filepath: string
): Promise<boolean> {
  try {
    const diskPath = getDiskPathFromPublicPath(filepath);
    await fs.unlink(diskPath).catch(() => {});
    const noteDir = path.join(notesRoot, noteId);
    try {
      const remaining = await fs.readdir(noteDir);
      if (remaining.length === 0) {
        await fs.rmdir(noteDir);
      }
    } catch {
      // ignore cleanup errors
    }
    return await noteService.deleteNoteFile(noteId, slotIndex);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'fileUploader',
      action: 'deleteNoteFile',
      noteId,
      filepath
    });
    return false;
  }
}
