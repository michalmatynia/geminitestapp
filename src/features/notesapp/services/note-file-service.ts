import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import { noteService } from '@/features/notesapp/server';
import {
  ALLOWED_MIME_EXACT,
  MAX_IMAGE_BYTES,
  notesRoot,
} from '@/shared/lib/files/constants';
import { createFileUploadEvent } from '@/shared/lib/files/services/file-upload-events';
import {
  uploadToConfiguredStorage,
  getPublicPathFromStoredPath,
} from '@/shared/lib/files/services/storage/file-storage-service';
import { deleteFileFromStorage } from '@/shared/lib/files/file-uploader';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { NoteFileRecord } from '@/shared/contracts/notes';
import { randomUUID } from 'crypto';

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

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return `${randomUUID()}${ext}`;
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
  const publicPath = `${publicDir}/${filename}`;
  const localDiskPath = path.join(diskDir, filename);
  let storageSource: 'local' | 'fastcomet' = 'local';

  try {
    const storageResult = await uploadToConfiguredStorage({
      buffer: fileBuffer,
      filename,
      mimetype: file.type || 'application/octet-stream',
      publicPath,
      category: 'notes',
      projectId: noteId,
      folder: null,
      writeLocalCopy: async (): Promise<void> => {
        await fs.mkdir(diskDir, { recursive: true });
        await fs.writeFile(localDiskPath, fileBuffer);
      },
    });
    const storedFilepath = storageResult.filepath;
    storageSource = storageResult.source;

    const noteFile = await noteService.createNoteFile({
      noteId,
      slotIndex,
      filename,
      filepath: storedFilepath,
      mimetype: file.type,
      size: file.size,
      width: null,
      height: null,
    });
    void createFileUploadEvent({
      status: 'success',
      category: 'notes',
      projectId: noteId,
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: file.type,
      size: file.size,
      source: 'noteFileService.uploadNoteFile',
      meta: { storageSource },
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
      source: 'noteFileService.uploadNoteFile',
      errorMessage: error instanceof Error ? error.message : 'Upload failed',
      meta: { storageSource },
    }).catch(() => {});
    await ErrorSystem.captureException(error, {
      service: 'noteFileService',
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
    await deleteFileFromStorage(filepath);
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
      service: 'noteFileService',
      action: 'deleteNoteFile',
      noteId,
      filepath,
    });
    return false;
  }
}
