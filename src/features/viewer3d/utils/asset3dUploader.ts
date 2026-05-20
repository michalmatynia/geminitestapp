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

/* eslint-disable max-lines, max-lines-per-function, complexity */

import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import {
  findAsset3DRepositoryAsset,
  getAsset3DRepository,
} from '@/features/viewer3d/services/asset3d-repository';
import type { Asset3DCreateInput, Asset3DRecord } from '@/shared/contracts/viewer3d';
import { badRequestError } from '@/shared/errors/app-error';
import {
  MILKBAR_CMS_MODELS_FOLDER,
  type FastCometStorageConfig,
  type FileStorageProfile,
  type FileStorageSource,
} from '@/shared/lib/files/constants';
import { assets3dRoot, publicRoot, uploadsRoot } from '@/shared/lib/files/server-constants';
import {
  deleteFileFromStorage,
  getDiskPathFromPublicPath,
  getPublicPathFromStoredPath,
  uploadToConfiguredStorage,
} from '@/shared/lib/files/services/image-file-service';
import {
  getFileStorageSettings,
} from '@/shared/lib/files/services/storage/file-storage-service';
import {
  deleteFromFastComet,
} from '@/shared/lib/files/services/storage/fastcomet-storage-client';
import {
  getAssets3DStorageSource,
} from '@/shared/lib/files/services/storage/storage-settings-service';
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
  /** Explicit storage source override for staged runtime uploads */
  storageSource?: FileStorageSource;
}

type MilkbarFastCometUploadOptions = {
  forceSource: 'fastcomet';
  fastCometBaseUrl: string;
  fastCometConfig: ReturnType<typeof resolveMilkbarFastCometStorageProfile>['fastCometConfig'];
};
type LocalUploadOptions = {
  forceSource: 'local';
};

type AssetStorageTarget = {
  diskDir: string;
  publicDir: string;
  category: string;
  folder: string | null;
  mirrorPublicHtml: boolean;
  fastCometUploadOptions:
    | MilkbarFastCometUploadOptions
    | LocalUploadOptions
    | Record<string, never>;
};

const MILKBAR_MODEL_PUBLIC_PATH_PREFIX = `/uploads/cms/${MILKBAR_CMS_MODELS_FOLDER}/`;
const MILKBAR_LOCAL_MODELS_ROOT = path.resolve(
  publicRoot,
  'uploads',
  'cms',
  MILKBAR_CMS_MODELS_FOLDER
);
const MAX_MODEL_DOWNLOAD_BYTES = 100 * 1024 * 1024;

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

const isMilkbarModelStoragePath = (value: string | null | undefined): boolean =>
  value?.includes(MILKBAR_MODEL_PUBLIC_PATH_PREFIX) === true;

const isMilkbarCmsAsset = (asset: Asset3DRecord): boolean =>
  readMetadataText(asset.metadata, 'storageProfile') === 'milkbarCms' ||
  isMilkbarModelStoragePath(readMetadataText(asset.metadata, 'publicPath')) ||
  isMilkbarModelStoragePath(asset.filepath) ||
  isMilkbarModelStoragePath(asset.fileUrl);

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

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

const isMilkbarModelPublicPath = (value: string | null): value is string =>
  value?.startsWith(MILKBAR_MODEL_PUBLIC_PATH_PREFIX) === true;

const isFastCometSafePathSegment = (value: string): boolean => /^[A-Za-z0-9._-]+$/.test(value);

const isFastCometSafePublicPath = (publicPath: string): boolean => {
  if (!publicPath.startsWith('/uploads/')) return false;
  return publicPath
    .slice('/uploads/'.length)
    .split('/')
    .filter((segment) => segment.length > 0)
    .every((segment) => segment !== '.' && segment !== '..' && isFastCometSafePathSegment(segment));
};

const resolveSafeMilkbarLocalModelDiskPath = (publicPath: string): string => {
  const relativePath = publicPath.slice(MILKBAR_MODEL_PUBLIC_PATH_PREFIX.length);
  const resolved = path.resolve(MILKBAR_LOCAL_MODELS_ROOT, relativePath);
  if (
    resolved !== MILKBAR_LOCAL_MODELS_ROOT &&
    !resolved.startsWith(`${MILKBAR_LOCAL_MODELS_ROOT}${path.sep}`)
  ) {
    throw badRequestError('Invalid Milkbar model path.', { publicPath });
  }
  return resolved;
};

const getModelExtension = (filename: string, contentType?: string | null): '.glb' | '.gltf' => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.glb' || ext === '.gltf') return ext;
  return contentType?.toLowerCase().includes('gltf-binary') === true ? '.glb' : '.gltf';
};

const getModelMimeType = (filename: string, contentType?: string | null): string => {
  const normalized = contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (normalized === 'model/gltf-binary' || normalized === 'model/gltf+json') return normalized;
  return getModelExtension(filename, contentType) === '.glb' ? 'model/gltf-binary' : 'model/gltf+json';
};

const getAssetFormatFromFilename = (filename: string): string =>
  path.extname(filename).toLowerCase() === '.glb' ? 'gltf-binary' : 'gltf+json';

const getFilenameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const decoded = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() ?? '');
    return decoded.length > 0 ? decoded : 'model.gltf';
  } catch {
    const fallback = url.split('/').filter(Boolean).pop() ?? 'model.gltf';
    return fallback.split(/[?#]/)[0] ?? 'model.gltf';
  }
};

const sanitizeMilkbarModelFilename = (filename: string, contentType?: string | null): string => {
  const ext = getModelExtension(filename, contentType);
  const rawStem = path.basename(filename, path.extname(filename));
  const stem = rawStem
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${Date.now()}-${stem.length > 0 ? stem : 'model'}${ext}`;
};

export const resolveMilkbarFastCometModelUploadPublicPath = (input: {
  filename: string;
  mimetype: string;
  publicPath: string;
}): string => {
  if (isFastCometSafePublicPath(input.publicPath)) return input.publicPath;
  return `${MILKBAR_MODEL_PUBLIC_PATH_PREFIX}${sanitizeMilkbarModelFilename(
    input.filename,
    input.mimetype
  )}`;
};

const createMilkbarAssetPayload = (input: {
  filename: string;
  mimetype: string;
  name?: string;
  publicPath: string;
  size: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Asset3DCreateInput => ({
  filename: input.filename,
  filepath: input.publicPath,
  mimetype: input.mimetype,
  size: input.size,
  fileUrl: input.publicPath,
  thumbnailUrl: null,
  fileSize: input.size,
  format: getAssetFormatFromFilename(input.filename),
  tags: input.tags ?? [],
  isPublic: true,
  name: getAssetName(input.filename, input.name),
  description: null,
  categoryId: 'cms',
  metadata: {
    ...(input.metadata ?? {}),
    publicPath: input.publicPath,
    storageProfile: 'milkbarCms',
    storageSource: 'local',
    mirroredLocally: true,
  },
});

const createMilkbarModelFile = (input: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}): File => new File([new Uint8Array(input.buffer)], input.filename, { type: input.mimetype });

const ensureValidMilkbarModelFile = async (file: File): Promise<void> => {
  if (!isValid3DAsset(file)) {
    throw badRequestError('Invalid 3D asset file type. Supported: .glb, .gltf');
  }
  const validation = await validate3DFileAsync(file);
  if (!validation.valid) {
    throw badRequestError(validation.error ?? 'Invalid 3D asset file.');
  }
};

const resolveMilkbarFastCometConfig = async (): Promise<FastCometStorageConfig> => {
  const settings = await getFileStorageSettings();
  const milkbarStorage = resolveMilkbarFastCometStorageProfile();
  return {
    ...settings.fastComet,
    ...milkbarStorage.fastCometConfig,
    baseUrl: milkbarStorage.publicBaseUrl,
  };
};

const isMilkbarAssetStoredOnFastComet = (asset: Asset3DRecord): boolean => {
  const metadata = asset.metadata;
  const storageSource = readMetadataText(metadata, 'storageSource');
  const uploadStatus = readMetadataText(metadata, 'fastCometUploadStatus');
  const publicBaseUrl = readMetadataText(metadata, 'publicBaseUrl');
  const filepath = asset.filepath?.trim() ?? '';
  const fileUrl = asset.fileUrl?.trim() ?? '';
  return (
    storageSource === 'fastcomet' ||
    uploadStatus === 'completed' ||
    publicBaseUrl !== null ||
    isHttpUrl(filepath) ||
    isHttpUrl(fileUrl)
  );
};

const toMilkbarFastCometAssetUrl = (publicPath: string): string => {
  const baseUrl = resolveMilkbarFastCometStorageProfile().publicBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}/${publicPath.replace(/^\/+/, '')}`;
};

const deleteMilkbarLocalPublicFile = async (asset: Asset3DRecord): Promise<void> => {
  if (!isMilkbarCmsAsset(asset)) return;
  const publicPath = resolveAssetPublicPath(asset);
  if (!isMilkbarModelPublicPath(publicPath)) return;
  await fs.unlink(resolveSafeMilkbarLocalModelDiskPath(publicPath)).catch(() => undefined);
};

const deleteMilkbarFastCometRemote = async (asset: Asset3DRecord): Promise<void> => {
  if (!isMilkbarCmsAsset(asset) || !isMilkbarAssetStoredOnFastComet(asset)) return;
  const publicPath = resolveAssetPublicPath(asset);
  if (!isMilkbarModelPublicPath(publicPath)) return;
  const storedPath = asset.filepath?.trim() ?? asset.fileUrl?.trim() ?? '';
  const filepath = isHttpUrl(storedPath) ? storedPath : toMilkbarFastCometAssetUrl(publicPath);
  await deleteFromFastComet({
    filepath,
    publicPath,
    fastComet: await resolveMilkbarFastCometConfig(),
  });
};

const readMilkbarModelAssetBuffer = async (
  asset: Asset3DRecord
): Promise<{ buffer: Buffer; filename: string; mimetype: string; publicPath: string }> => {
  const publicPath = resolveAssetPublicPath(asset);
  if (!isMilkbarModelPublicPath(publicPath)) {
    throw badRequestError('3D asset is not a Milkbar CMS model.', { id: asset.id });
  }

  const candidatePaths = [
    resolveSafeMilkbarLocalModelDiskPath(publicPath),
    getMilkbarFastCometPublicHtmlMirrorPath(publicPath),
    getDiskPathFromPublicPath(publicPath),
  ];
  for (const candidatePath of candidatePaths) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const buffer = await fs.readFile(candidatePath);
      const filename = asset.filename ?? path.basename(publicPath);
      return {
        buffer,
        filename,
        mimetype: asset.mimetype ?? getModelMimeType(filename),
        publicPath,
      };
    } catch {
      // Try the next known local mirror.
    }
  }

  throw badRequestError('Local 3D model file is not available for FastComet upload.', {
    id: asset.id,
    publicPath,
  });
};

function resolveAssetStorageTarget(
  storageProfile: FileStorageProfile | undefined,
  storageSource: FileStorageSource | undefined
): AssetStorageTarget {
  if (storageProfile === 'milkbarCms') {
    const milkbarStorage = resolveMilkbarFastCometStorageProfile();
    return {
      diskDir: path.join(uploadsRoot, 'cms', MILKBAR_CMS_MODELS_FOLDER),
      publicDir: `/uploads/cms/${MILKBAR_CMS_MODELS_FOLDER}`,
      category: 'cms',
      folder: MILKBAR_CMS_MODELS_FOLDER,
      mirrorPublicHtml: true,
      fastCometUploadOptions:
        storageSource === 'local'
          ? { forceSource: 'local' as const }
          : {
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
    fastCometUploadOptions: storageSource === 'local' ? { forceSource: 'local' as const } : {},
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
): Promise<{
  filename: string;
  mirroredLocally: boolean;
  publicPath: string;
  storageSource: FileStorageSource;
  storedFilepath: string;
}> {
  // Generate unique filename with timestamp to prevent collisions
  const filename =
    options.storageProfile === 'milkbarCms'
      ? sanitizeMilkbarModelFilename(file.name, file.type)
      : `${Date.now()}-${path.basename(file.name)}`;
  const storageTarget = resolveAssetStorageTarget(options.storageProfile, options.storageSource);
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

  return {
    filename,
    mirroredLocally: storageResult.mirroredLocally,
    publicPath,
    storageSource: storageResult.source,
    storedFilepath: storageResult.filepath,
  };
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
  mirroredLocally: boolean;
  options: UploadOptions;
  publicPath: string;
  storageSource: FileStorageSource;
}): Asset3DCreateInput {
  const {
    filename,
    file,
    mirroredLocally,
    options,
    publicPath,
    storageSource,
    storedFilepath,
  } = input;
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
      storageSource,
      mirroredLocally,
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

  // For non-milkbar profiles, resolve the per-feature storage source (defaults to 'local').
  // This ensures generic 3D assets are never silently routed to the global FastComet config.
  const resolvedStorageSource =
    safeOptions.storageProfile !== 'milkbarCms' && safeOptions.storageSource === undefined
      ? await getAssets3DStorageSource()
      : safeOptions.storageSource;
  const resolvedOptions: UploadOptions = { ...safeOptions, storageSource: resolvedStorageSource };

  try {
    const {
      filename,
      mirroredLocally,
      publicPath,
      storageSource,
      storedFilepath,
    } = await prepareAssetStorage(
      file,
      fileBuffer,
      resolvedOptions
    );
    const repository = getAsset3DRepository({ storageProfile: resolvedOptions.storageProfile });
    const payload = mapAssetOptionsToCreatePayload({
      filename,
      storedFilepath,
      file,
      mirroredLocally,
      options: resolvedOptions,
      publicPath,
      storageSource,
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

export async function createMilkbarAsset3DFromLink(input: {
  name?: string;
  tags?: string[];
  url: string;
}): Promise<Asset3DRecord> {
  const url = input.url.trim();
  if (url.length === 0) {
    throw badRequestError('Model URL is required.');
  }

  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'asset3dUploader',
      action: 'createMilkbarAsset3DFromLink.fetch',
      url,
    });
    throw badRequestError('Could not download 3D model from link.', { url });
  }

  if (!response.ok) {
    throw badRequestError('Could not download 3D model from link.', {
      url,
      status: response.status,
    });
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_MODEL_DOWNLOAD_BYTES) {
    throw badRequestError('3D model download exceeds the 100MB limit.', {
      url,
      size: contentLength,
    });
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_MODEL_DOWNLOAD_BYTES) {
    throw badRequestError('3D model download exceeds the 100MB limit.', {
      url,
      size: buffer.byteLength,
    });
  }

  const contentType = response.headers.get('content-type');
  const filename = sanitizeMilkbarModelFilename(getFilenameFromUrl(url), contentType);
  const mimetype = getModelMimeType(filename, contentType);
  const file = createMilkbarModelFile({ buffer, filename, mimetype });
  await ensureValidMilkbarModelFile(file);

  const publicPath = `${MILKBAR_MODEL_PUBLIC_PATH_PREFIX}${filename}`;
  await writeFileBuffer(resolveSafeMilkbarLocalModelDiskPath(publicPath), buffer);

  const repository = getAsset3DRepository({ storageProfile: 'milkbarCms' });
  return await repository.createAsset3D(
    createMilkbarAssetPayload({
      filename,
      mimetype,
      name: input.name,
      publicPath,
      size: buffer.byteLength,
      tags: input.tags,
      metadata: {
        sourceUrl: url,
        linkedFromUrl: url,
      },
    })
  );
}

export async function uploadMilkbarAsset3DToFastComet(id: string): Promise<Asset3DRecord | null> {
  const match = await findAsset3DRepositoryAsset(id);
  if (match === null) return null;

  const { asset } = match;
  const { buffer, filename, mimetype, publicPath } = await readMilkbarModelAssetBuffer(asset);
  const uploadPublicPath = resolveMilkbarFastCometModelUploadPublicPath({
    filename,
    mimetype,
    publicPath,
  });
  const milkbarStorage = resolveMilkbarFastCometStorageProfile();
  const storageResult = await uploadToConfiguredStorage({
    buffer,
    filename,
    mimetype,
    publicPath: uploadPublicPath,
    category: 'cms',
    projectId: null,
    folder: MILKBAR_CMS_MODELS_FOLDER,
    forceSource: 'fastcomet',
    fastCometBaseUrl: milkbarStorage.publicBaseUrl,
    fastCometConfig: milkbarStorage.fastCometConfig,
    writeLocalCopy: async (): Promise<void> => {
      await writeFileBuffer(resolveSafeMilkbarLocalModelDiskPath(uploadPublicPath), buffer);
    },
  });
  await writeMilkbarPublicHtmlMirror(uploadPublicPath, buffer);

  return await match.repository.updateAsset3D(id, {
    filepath: storageResult.filepath,
    fileUrl: storageResult.filepath,
    metadata: {
      ...(asset.metadata ?? {}),
      publicPath: uploadPublicPath,
      publicBaseUrl: milkbarStorage.publicBaseUrl,
      storageProfile: 'milkbarCms',
      storageSource: 'fastcomet',
      fastCometUploadStatus: 'completed',
      uploadedToFastCometAt: new Date().toISOString(),
      mirroredLocally: true,
    },
  });
}

export async function deleteAsset3D(id: string): Promise<boolean> {
  try {
    const match = await findAsset3DRepositoryAsset(id);

    if (match === null) {
      return false;
    }

    const filepath = match.asset.filepath ?? '';
    if (isMilkbarCmsAsset(match.asset)) {
      if (filepath !== '' && !isHttpUrl(filepath)) {
        await deleteFileFromStorage(filepath);
      }
      await deleteMilkbarLocalPublicFile(match.asset);
      await deleteMilkbarFastCometRemote(match.asset);
      await deleteMilkbarPublicHtmlMirror(match.asset);
    } else if (filepath !== '') {
      await deleteFileFromStorage(filepath);
    }
    // Delete from database
    await match.repository.deleteAsset3D(id);

    return true;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'asset3dUploader',
      action: 'deleteAsset3D',
      id,
    });
    throw error;
  }
}
