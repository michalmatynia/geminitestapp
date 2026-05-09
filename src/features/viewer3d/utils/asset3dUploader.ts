/**
 * 3D Asset Upload Module
 * 
 * Handles uploading and storing 3D model files to configured storage.
 * Manages:
 * - File validation and format detection
 * - Storage to disk and cloud services
 * - Database record creation
 * - Metadata and tagging
 * - Error handling and cleanup
 * 
 * Server-only module - runs on Node.js backend only
 */

import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import { getAsset3DRepository } from '@/features/viewer3d/services/asset3d-repository';
import type { Asset3DCreateInput, Asset3DRecord } from '@/shared/contracts/viewer3d';
import { badRequestError } from '@/shared/errors/app-error';
import { assets3dRoot } from '@/shared/lib/files/server-constants';
import {
  deleteFileFromStorage,
  uploadToConfiguredStorage,
} from '@/shared/lib/files/services/image-file-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { isValid3DAsset, validate3DFileAsync } from './validateAsset3d';

/**
 * Options for customizing 3D asset upload behavior
 */
interface UploadOptions {
  /** Custom name for the asset (defaults to derived from filename) */
  name?: string;
  /** Asset description for metadata */
  description?: string;
  /** Category for organizing assets */
  category?: string;
  /** Tags for searching and filtering */
  tags?: string[];
  /** Whether the asset is publicly accessible */
  isPublic?: boolean;
  /** Additional custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Prepares and stores a 3D asset file to configured storage
 * Handles both local disk and cloud storage uploads
 * 
 * Process:
 * 1. Generate unique filename with timestamp prefix
 * 2. Upload to configured storage service (local/cloud)
 * 3. Write local copy to disk for reindexing
 * 4. Return storage paths
 * 
 * @param file - The File object to upload
 * @param fileBuffer - Pre-read file buffer
 * @returns Object containing filename and storage filepath
 */
async function prepareAssetStorage(file: File, fileBuffer: Buffer): Promise<{ filename: string; storedFilepath: string }> {
  // Generate unique filename with timestamp to prevent collisions
  const filename = `${Date.now()}-${path.basename(file.name)}`;
  const diskDir = assets3dRoot;
  const publicDir = '/uploads/assets3d';
  const publicPath = `${publicDir}/${filename}`;
  const localDiskPath = `${diskDir}/${filename}`;

  // Upload to configured storage (local or cloud)
  const storageResult = await uploadToConfiguredStorage({
    buffer: fileBuffer,
    filename,
    mimetype: file.type !== '' ? file.type : 'application/octet-stream',
    publicPath,
    category: 'assets3d',
    projectId: null,
    folder: null,
    // Also write to local disk for reindexing operations
    writeLocalCopy: async (): Promise<void> => {
      await fs.mkdir(diskDir, { recursive: true });
      await fs.writeFile(localDiskPath, fileBuffer);
    },
  });

  return { filename, storedFilepath: storageResult.filepath };
}

/**
 * Extracts MIME type from File object with fallback
 * 
 * @param file - The File object
 * @returns MIME type string or generic fallback
 */
function getAssetMimeType(file: File): string {
  const type = file.type;
  return type !== '' ? type : 'application/octet-stream';
}

/**
 * Derives file format from MIME type
 * Used for metadata and format tracking
 * 
 * @param mimeType - The MIME type string
 * @returns Format string (e.g., 'gltf-binary', 'gltf+json')
 */
function getAssetFormat(mimeType: string): string {
  const format = mimeType.split('/').pop() ?? '';
  return format !== '' ? format : 'bin';
}

function getAssetName(filename: string, nameOption?: string): string {
  const name = nameOption ?? '';
  return name !== '' ? name : filename;
}

function mapAssetOptionsToCreatePayload(
  filename: string, 
  storedFilepath: string, 
  file: File, 
  options: UploadOptions
): Asset3DCreateInput {
  const mimeType = getAssetMimeType(file);
  const format = getAssetFormat(mimeType);
  const name = getAssetName(filename, options.name);
  
  return {
    filename,
    filepath: storedFilepath,
    mimetype: mimeType,
    size: file.size,
    fileUrl: storedFilepath,
    thumbnailUrl: null,
    fileSize: file.size,
    format,
    tags: options.tags ?? [],
    isPublic: options.isPublic ?? false,
    name,
    description: options.description ?? null,
    categoryId: options.category ?? null,
    metadata: options.metadata ?? {},
  };
}

export async function uploadAsset3D(
  file: File,
  options?: UploadOptions
): Promise<Asset3DRecord> {
  if (!isValid3DAsset(file)) {
    throw badRequestError('Invalid 3D asset file type. Supported: .glb, .gltf');
  }
  const validation = await validate3DFileAsync(file);
  if (!validation.valid) {
    throw badRequestError(validation.error ?? 'Invalid 3D asset file.');
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const safeOptions: UploadOptions = options ?? {};
  
  try {
    const { filename, storedFilepath } = await prepareAssetStorage(file, fileBuffer);
    const repository = getAsset3DRepository();
    const payload = mapAssetOptionsToCreatePayload(filename, storedFilepath, file, safeOptions);
    const asset = await repository.createAsset3D(payload);

    return asset;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'asset3dUploader',
      action: 'uploadAsset3D',
    });
    throw error;
  }
}

export async function deleteAsset3D(id: string): Promise<boolean> {
  try {
    const repository = getAsset3DRepository();
    const asset = await repository.getAsset3DById(id);

    if (asset === null) {
      return false;
    }

    const filepath = asset.filepath ?? '';
    if (filepath !== '') {
      await deleteFileFromStorage(filepath);
    }
    // Delete from database
    await repository.deleteAsset3D(id);

    return true;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'asset3dUploader',
      action: 'deleteAsset3D',
      id,
    });
    return false;
  }
}
