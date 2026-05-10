/**
 * File Path Service
 * 
 * Manages filesystem path normalization, sanitization, and traversal security
 * for file uploads and management.
 */

import path from 'path';
import { randomUUID } from 'crypto';
import { configurationError } from '@/shared/errors/app-error';
import { uploadsRoot, publicRoot } from '../../server-constants';

/**
 * Sanitizes an SKU string for filesystem use.
 */
export const sanitizeSku = (sku: string): string => sku.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

/**
 * Sanitizes a segment string for filesystem use.
 */
export const sanitizeSegment = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

/**
 * Sanitizes a folder path string for filesystem use.
 */
export const sanitizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part !== '.' && part !== '..')
    .map((part) => part.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);
  return parts.join('/');
};

/**
 * Sanitizes a filename, generating a unique ID and preserving the original extension.
 */
export const sanitizeFilename = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  return `${randomUUID()}${ext}`;
};

/**
 * Resolves a safe disk path from a public path, with path traversal protection.
 */
export const getDiskPathFromPublicPath = (publicPath: string): string => {
  if (publicPath.startsWith('/uploads/')) {
    const cleaned = publicPath.replace(/^\/uploads\/+/, '');
    const resolved = path.resolve(uploadsRoot, cleaned);
    if (!resolved.startsWith(uploadsRoot + path.sep) && resolved !== uploadsRoot) {
      throw configurationError('Security Error: Invalid path traversal attempt detected.', {
        publicPath,
        resolvedPath: resolved,
        restrictedBase: uploadsRoot,
      });
    }
    return resolved;
  }

  const cleaned = publicPath.replace(/^\/+/, '');
  const resolved = path.resolve(publicRoot, cleaned);
  if (!resolved.startsWith(publicRoot + path.sep) && resolved !== publicRoot) {
    throw configurationError('Security Error: Invalid path traversal attempt detected.', {
      publicPath,
      resolvedPath: resolved,
      restrictedBase: publicRoot,
    });
  }
  return resolved;
};
