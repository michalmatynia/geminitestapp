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


interface UploadOptions {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

async function prepareAssetStorage(file: File, fileBuffer: Buffer): Promise<{ filename: string; storedFilepath: string }> {
  const filename = `${Date.now()}-${path.basename(file.name)}`;
  const diskDir = assets3dRoot;
  const publicDir = '/uploads/assets3d';
  const publicPath = `${publicDir}/${filename}`;
  const localDiskPath = `${diskDir}/${filename}`;

  const storageResult = await uploadToConfiguredStorage({
    buffer: fileBuffer,
    filename,
    mimetype: file.type !== '' ? file.type : 'application/octet-stream',
    publicPath,
    category: 'assets3d',
    projectId: null,
    folder: null,
    writeLocalCopy: async (): Promise<void> => {
      await fs.mkdir(diskDir, { recursive: true });
      await fs.writeFile(localDiskPath, fileBuffer);
    },
  });

  return { filename, storedFilepath: storageResult.filepath };
}

function getAssetMimeType(file: File): string {
  const type = file.type;
  return type !== '' ? type : 'application/octet-stream';
}

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
