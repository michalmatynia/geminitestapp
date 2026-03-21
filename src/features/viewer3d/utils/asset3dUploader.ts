import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import { getAsset3DRepository } from '@/features/viewer3d/services/asset3d-repository';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { badRequestError } from '@/shared/errors/app-error';
import { assets3dRoot } from '@/shared/lib/files/server-constants';
import {
  deleteFileFromStorage,
  uploadToConfiguredStorage,
} from '@/shared/lib/files/services/image-file-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { isValid3DAsset, validate3DFileAsync } from './validateAsset3d';


export async function uploadAsset3D(
  file: File,
  options?: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    isPublic?: boolean;
    metadata?: Record<string, unknown>;
  }
): Promise<Asset3DRecord> {
  if (!isValid3DAsset(file)) {
    throw badRequestError('Invalid 3D asset file type. Supported: .glb, .gltf');
  }
  const validation = await validate3DFileAsync(file);
  if (!validation.valid) {
    throw badRequestError(validation.error ?? 'Invalid 3D asset file.');
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${path.basename(file.name)}`;
  const diskDir = assets3dRoot;
  const publicDir = '/uploads/assets3d';
  const publicPath = `${publicDir}/${filename}`;
  const localDiskPath = `${diskDir}/${filename}`;
  let storedFilepath: string;

  try {
    const storageResult = await uploadToConfiguredStorage({
      buffer: fileBuffer,
      filename,
      mimetype: file.type || 'application/octet-stream',
      publicPath,
      category: 'assets3d',
      projectId: null,
      folder: null,
      writeLocalCopy: async (): Promise<void> => {
        await fs.mkdir(diskDir, { recursive: true });
        await fs.writeFile(localDiskPath, fileBuffer);
      },
    });
    storedFilepath = storageResult.filepath;

    const repository = getAsset3DRepository();
    const asset = await repository.createAsset3D({
      filename,
      filepath: storedFilepath,
      mimetype: file.type || 'application/octet-stream',
      size: file.size,
      fileUrl: storedFilepath,
      thumbnailUrl: null,
      fileSize: file.size,
      format: (file.type || '').split('/').pop() || 'bin',
      tags: options?.tags ?? [],
      isPublic: options?.isPublic ?? false,
      name: options?.name ?? filename,
      description: options?.description ?? null,
      categoryId: options?.category ?? null,
      metadata: options?.metadata ?? {},
    });

    return asset;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'asset3dUploader',
      action: 'uploadAsset3D',
      filename,
      diskDir,
    });
    throw error;
  }
}

export async function deleteAsset3D(id: string): Promise<boolean> {
  try {
    const repository = getAsset3DRepository();
    const asset = await repository.getAsset3DById(id);

    if (!asset) {
      return false;
    }

    if (asset.filepath) {
      await deleteFileFromStorage(asset.filepath);
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
