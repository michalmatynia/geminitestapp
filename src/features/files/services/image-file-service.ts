import 'server-only';

import { ErrorSystem } from '@/features/observability/server';
import type { ImageFileRecord, ImageFileRepository, ImageFileCreateInput, ImageFileListFilters } from '@/shared/contracts/files';

import { getImageFileRepository } from './image-file-repository';


/**
 * Service that wraps the Image File repository with error handling and logging.
 */
const repoCall = async <K extends keyof ImageFileRepository>(
  key: K,
  ...args: Parameters<ImageFileRepository[K]>
): Promise<Awaited<ReturnType<ImageFileRepository[K]>>> => {
  try {
    const repo = await getImageFileRepository();
    const fn = repo[key] as (
      ...args: Parameters<ImageFileRepository[K]>
    ) => ReturnType<ImageFileRepository[K]>;
    return await fn(...args) as Promise<Awaited<ReturnType<ImageFileRepository[K]>>>;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'image-file-service',
      action: 'repoCall',
      method: key,
    });
    throw error;
  }
};

export const imageFileService: ImageFileRepository = {
  createImageFile: (data: ImageFileCreateInput): Promise<ImageFileRecord> =>
    repoCall('createImageFile', data),
  getImageFileById: (id: string): Promise<ImageFileRecord | null> =>
    repoCall('getImageFileById', id),
  listImageFiles: (filters?: ImageFileListFilters): Promise<ImageFileRecord[]> =>
    repoCall('listImageFiles', filters),
  findImageFilesByIds: (ids: string[]): Promise<ImageFileRecord[]> =>
    repoCall('findImageFilesByIds', ids),
  updateImageFilePath: (id: string, filepath: string): Promise<ImageFileRecord | null> =>
    repoCall('updateImageFilePath', id, filepath),
  updateImageFileTags: (id: string, tags: string[]): Promise<ImageFileRecord | null> =>
    repoCall('updateImageFileTags', id, tags),
  updateImageFile: (id: string, data: any): Promise<ImageFileRecord | null> =>
    repoCall('updateImageFile', id, data),
  deleteImageFile: (id: string): Promise<ImageFileRecord | null> =>
    repoCall('deleteImageFile', id),
};
