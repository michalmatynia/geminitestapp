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
  return new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']).has(ext);
}
// ... (rest of file remains same)
