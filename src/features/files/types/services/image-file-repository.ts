import type { ImageFileListFiltersDto, ImageFileCreateInputDto } from '@/shared/contracts/files';
import type { ImageFileRecord } from '@/shared/contracts/files';

export type { ImageFileRecord };

export type ImageFileCreateInput = ImageFileCreateInputDto;

export type ImageFileListFilters = ImageFileListFiltersDto;

export type ImageFileRepository = {
  createImageFile(data: ImageFileCreateInput): Promise<ImageFileRecord>;
  getImageFileById(id: string): Promise<ImageFileRecord | null>;
  listImageFiles(filters?: ImageFileListFilters): Promise<ImageFileRecord[]>;
  findImageFilesByIds(ids: string[]): Promise<ImageFileRecord[]>;
  updateImageFilePath(
    id: string,
    filepath: string
  ): Promise<ImageFileRecord | null>;
  updateImageFileTags(
    id: string,
    tags: string[]
  ): Promise<ImageFileRecord | null>;
  deleteImageFile(id: string): Promise<ImageFileRecord | null>;
};
