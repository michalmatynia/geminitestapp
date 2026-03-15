import 'server-only';

import type {
  ImageFileRecord,
  ImageFileRepository,
  ImageFileCreateInput,
  ImageFileListFilters,
  ImageFileUpdateInput,
} from '@/shared/contracts/files';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getImageFileRepository } from './image-file-repository';
import { mongoImageFileRepository } from './image-file-repository/mongo-image-file-repository';

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
    return (await fn(...args)) as Promise<Awaited<ReturnType<ImageFileRepository[K]>>>;
  } catch (error) {
    void ErrorSystem.captureException(error);
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
  updateImageFile: (id: string, data: ImageFileUpdateInput): Promise<ImageFileRecord | null> =>
    repoCall('updateImageFile', id, data),
  deleteImageFile: (id: string): Promise<ImageFileRecord | null> => repoCall('deleteImageFile', id),
};

export type {
  ImageFileCreateInput,
  ImageFileListFilters,
  ImageFileRecord,
  ImageFileRepository,
  ImageFileUpdateInput,
};

export { getImageFileRepository, mongoImageFileRepository };
export { deleteFileFromStorage, getDiskPathFromPublicPath, uploadFile } from '../file-uploader';
export {
  getPublicPathFromStoredPath,
  uploadToConfiguredStorage,
} from './storage/file-storage-service';
