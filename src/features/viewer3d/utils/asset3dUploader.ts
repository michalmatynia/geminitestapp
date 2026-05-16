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
import {
  MILKBAR_CMS_MODELS_FOLDER,
  type FileStorageProfile,
} from '@/shared/lib/files/constants';
import { assets3dRoot, uploadsRoot } from '@/shared/lib/files/server-constants';
import {
  deleteFileFromStorage,
  getPublicPathFromStoredPath,
  uploadToConfiguredStorage,
} from '@/shared/lib/files/services/image-file-service';
import {
  getMilkbarFastCometPublicHtmlMirrorPath,
  writeMilkbarFastCometPublicHtmlMirrorFile,
} from '@/shared/lib/files/services/storage/milkbar-fastcomet-public-html-mirror';
import { resolveMilkbarFastCometStorageProfile } from '@/shared/lib/files/services/storage/milkbar-fastcomet-storage';
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
  /** Storage profile for domain-specific public upload roots */
  storageProfile?: FileStorageProfile;
}

type MilkbarFastCometUploadOptions = {
  forceSource: 'fastcomet';
  fastCometBaseUrl: string;
  fastCometConfig: ReturnType<typeof resolveMilkbarFastCometStorageProfile>['fastCometConfig'];
};

type AssetStorageTarget = {
  diskDir: string;
  publicDir: string;
  category: string;
  folder: string | null;
  mirrorPublicHtml: boolean;
  fastCometUploadOptions: MilkbarFastCometUploadOptions | Record<string, never>;
};

const writeFileBuffer = async (diskPath: string, fileBuffer: Buffer): Promise<void> => {
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, fileBuffer);
};

const writeMilkbarPublicHtmlMirror = async (
  publicPath: string,
  fileBuffer: Buffer
): Promise<void> => {
  await writeMilkbarFastCometPublicHtmlMirrorFile(publicPath, fileBuffer);
};

const readMetadataText = (
  metadata: Record<string, unknown> | undefined,
  key: string
): string | null => {
  const value = metadata?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isMilkbarCmsAsset = (asset: Asset3DRecord): boolean =>
  readMetadataText(asset.metadata, 'storageProfile') === 'milkbarCms';

const resolveAssetPublicPath = (asset: Asset3DRecord): string | null => {
  const metadataPath = readMetadataText(asset.metadata, 'publicPath');
  if (metadataPath !== null) return metadataPath;
  const filepath = asset.filepath?.trim() ?? '';
  return filepath.length > 0 ? getPublicPathFromStoredPath(filepath) : null;
};

const deleteMilkbarPublicHtmlMirror = async (asset: Asset3DRecord): Promise<void> => {
  if (!isMilkbarCmsAsset(asset)) return;
  const publicPath = resolveAssetPublicPath(asset);
  if (publicPath?.startsWith('/uploads/cms/models/') !== true) return;
  await fs.unlink(getMilkbarFastCometPublicHtmlMirrorPath(publicPath)).catch(() => undefined);
};

function resolveAssetStorageTarget(
  storageProfile: FileStorageProfile | undefined
): AssetStorageTarget {
  if (storageProfile === 'milkbarCms') {
    const milkbarStorage = resolveMilkbarFastCometStorageProfile();
    return {
      diskDir: path.join(uploadsRoot, 'cms', MILKBAR_CMS_MODELS_FOLDER),
      publicDir: `/uploads/cms/${MILKBAR_CMS_MODELS_FOLDER}`,
      category: 'cms',
      folder: MILKBAR_CMS_MODELS_FOLDER,
      mirrorPublicHtml: true,
      fastCometUploadOptions: {
        forceSource: 'fastcomet' as const,
        fastCometBaseUrl: milkbarStorage.publicBaseUrl,
        fastCometConfig: milkbarStorage.fastCometConfig,
      },
    };
  }

  return {
    diskDir: assets3dRoot,
    publicDir: '/uploads/assets3d',
    category: 'assets3d',
    folder: null,
    mirrorPublicHtml: false,
    fastCometUploadOptions: {},
  };
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
async function prepareAssetStorage(
  file: File,
  fileBuffer: Buffer,
  options: UploadOptions
): Promise<{ filename: string; storedFilepath: string; publicPath: string }> {
  // Generate unique filename with timestamp to prevent collisions
  const filename = `${Date.now()}-${path.basename(file.name)}`;
  const storageTarget = resolveAssetStorageTarget(options.storageProfile);
  const { diskDir, publicDir } = storageTarget;
  const publicPath = `${publicDir}/${filename}`;
  const localDiskPath = `${diskDir}/${filename}`;

  // Upload to configured storage (local or cloud)
  const storageResult = await uploadToConfiguredStorage({
    buffer: fileBuffer,
    filename,
    mimetype: file.type !== '' ? file.type : 'application/octet-stream',
    publicPath,
    category: storageTarget.category,
    projectId: null,
    folder: storageTarget.folder,
    ...storageTarget.fastCometUploadOptions,
    // Also write to local disk for reindexing operations
    writeLocalCopy: async (): Promise<void> => {
      await writeFileBuffer(localDiskPath, fileBuffer);
    },
  });

  if (storageTarget.mirrorPublicHtml) {
    await writeMilkbarPublicHtmlMirror(publicPath, fileBuffer);
  }

  return { filename, storedFilepath: storageResult.filepath, publicPath };
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

function mapAssetOptionsToCreatePayload(input: {
  filename: string;
  storedFilepath: string;
  file: File;
  options: UploadOptions;
  publicPath: string;
}): Asset3DCreateInput {
  const { filename, storedFilepath, file, options, publicPath } = input;
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
    metadata: {
      ...(options.metadata ?? {}),
      publicPath,
      storageProfile: options.storageProfile ?? 'default',
      ...(options.storageProfile === 'milkbarCms'
        ? { publicBaseUrl: resolveMilkbarFastCometStorageProfile().publicBaseUrl }
        : {}),
    },
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
    const { filename, storedFilepath, publicPath } = await prepareAssetStorage(
      file,
      fileBuffer,
      safeOptions
    );
    const repository = getAsset3DRepository();
    const payload = mapAssetOptionsToCreatePayload({
      filename,
      storedFilepath,
      file,
      options: safeOptions,
      publicPath,
    });
    const asset = await (repository.createAsset3D(payload));

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
    await deleteMilkbarPublicHtmlMirror(asset);
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
