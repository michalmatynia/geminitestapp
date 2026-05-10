/**
 * 3D Asset Reindexing Module
 * 
 * Synchronizes 3D assets from disk storage with the database.
 * Handles:
 * - Scanning disk for 3D model files
 * - Filtering for supported formats (GLB, GLTF)
 * - Creating database records for new assets
 * - Deriving human-readable names from filenames
 * - Tracking reindexing statistics
 * 
 * Server-only module - runs on Node.js backend only
 */

import 'server-only';

import fs from 'fs/promises';
import type { Dirent } from 'fs';
import path from 'path';

import { getAsset3DRepository } from '@/features/viewer3d/services/asset3d-repository';
import { assets3dRoot } from '@/shared/lib/files/server-constants';

import { SUPPORTED_3D_FORMATS, type Supported3DExtension } from './validateAsset3d';

/** Disk directory where 3D assets are stored */
const assets3dDiskDir = assets3dRoot;
/** Public URL path for accessing 3D assets */
const assets3dPublicDir = '/uploads/assets3d';

/**
 * Type guard to check if a filename has a supported 3D format extension
 * 
 * @param filename - The filename to check
 * @returns true if the file has a supported 3D extension
 */
const isSupported3DFile = (filename: string): filename is string => {
  const ext = `.${filename.split('.').pop() ?? ''}`.toLowerCase() as Supported3DExtension;
  return ext in SUPPORTED_3D_FORMATS;
};

/**
 * Converts a string to title case (capitalize first letter of each word)
 * Used for formatting derived asset names
 * 
 * @param value - The string to convert
 * @returns Title-cased string
 */
const toTitleCase = (value: string): string =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Derives a human-readable asset name from a filename
 * Handles common uploader pattern: `${Date.now()}-${originalName}`
 * 
 * Process:
 * 1. Remove file extension
 * 2. Remove timestamp prefix (10+ digit numbers followed by dash)
 * 3. Replace hyphens/underscores with spaces
 * 4. Normalize whitespace
 * 5. Convert to title case
 * 
 * @param filename - The filename to process
 * @returns Derived asset name or null if filename is invalid
 */
const deriveAssetName = (filename: string): string | null => {
  // Common uploader pattern: `${Date.now()}-${originalName}`
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const withoutTimestampPrefix = withoutExt.replace(/^\d{10,}-/, '');
  const cleaned = withoutTimestampPrefix.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned === '') return null;
  return toTitleCase(cleaned);
};

interface Asset3DReindexStats {
  diskFiles: number;
  supportedFiles: number;
  existingRecords: number;
  created: number;
  skipped: number;
  createdIds: string[];
}

const buildReindexStats = (
  diskFiles: string[],
  supported: string[],
  existingRecords: number,
  createdIds: string[]
): Asset3DReindexStats => ({
  diskFiles: diskFiles.length,
  supportedFiles: supported.length,
  existingRecords,
  created: createdIds.length,
  skipped: supported.length - createdIds.length,
  createdIds,
});

async function createMissingAsset(filename: string): Promise<string> {
  const repository = getAsset3DRepository();
  const ext = `.${filename.split('.').pop() ?? ''}`.toLowerCase() as Supported3DExtension;
  const format = SUPPORTED_3D_FORMATS[ext];
  const stat = await fs.stat(path.join(assets3dDiskDir, filename));
  const record = await repository.createAsset3D({
    name: deriveAssetName(filename) ?? filename,
    description: null,
    filename,
    filepath: `${assets3dPublicDir}/${filename}`,
    fileUrl: `${assets3dPublicDir}/${filename}`,
    mimetype: format.mimetype,
    size: stat.size,
    fileSize: stat.size,
    format: ext.slice(1),
    tags: [],
    categoryId: null,
    metadata: {},
    isPublic: false,
  });
  return record.id;
}

/**
 * Reindexes 3D assets from disk into the database
 * Scans the assets directory, identifies new files, and creates database records
 * 
 * @returns Statistics about the reindexing operation
 *   - diskFiles: Total files found on disk
 *   - supportedFiles: Files with supported 3D formats
 *   - existingRecords: Database records already present
 *   - created: New records created
 *   - skipped: Files already in database
 *   - createdIds: IDs of newly created records
 */
export async function reindexAsset3DUploadsFromDisk(): Promise<Asset3DReindexStats> {
  // Read all files from the assets directory
  const entries: Dirent[] = await fs
    .readdir(assets3dDiskDir, { withFileTypes: true })
    .catch(() => []);
  
  // Filter to only files (not directories)
  const diskFiles: string[] = entries
    .filter((entry: Dirent) => entry.isFile())
    .map((entry: Dirent) => entry.name);
  
  // Filter to only supported 3D formats
  const supported: string[] = diskFiles.filter(isSupported3DFile);

  // Early return if no supported files found
  if (supported.length === 0) {
    return buildReindexStats(diskFiles, supported, 0, []);
  }

  // Get repository and existing assets from database
  const repository = getAsset3DRepository();
  const existingAssets = await repository.listAssets3D();
  const supportedNames = new Set<string>(supported);
  
  // Build set of existing filenames that are in supported formats
  const existingNames: Set<string> = new Set(
    existingAssets
      .map((asset) => asset.filename)
      .filter(
        (filename): filename is string => filename !== undefined && supportedNames.has(filename)
      )
  );

  // Find files on disk that don't have database records
  const missing: string[] = supported.filter((filename: string) => !existingNames.has(filename));
  
  // Early return if all files already indexed
  if (missing.length === 0) {
    return buildReindexStats(diskFiles, supported, existingNames.size, []);
  }

  const createdIds: string[] = await Promise.all(missing.map(createMissingAsset));
  return buildReindexStats(diskFiles, supported, existingNames.size, createdIds);
}
