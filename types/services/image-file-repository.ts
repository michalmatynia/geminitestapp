import type { ImageFileRecord } from "@/types";

export type { ImageFileRecord };

export type ImageFileCreateInput = {
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width?: number | null;
  height?: number | null;
};

export type ImageFileListFilters = {
  filename?: string | null;
};

export type ImageFileRepository = {
  createImageFile(data: ImageFileCreateInput): Promise<ImageFileRecord>;
  getImageFileById(id: string): Promise<ImageFileRecord | null>;
  listImageFiles(filters?: ImageFileListFilters): Promise<ImageFileRecord[]>;
  findImageFilesByIds(ids: string[]): Promise<ImageFileRecord[]>;
  updateImageFilePath(
    id: string,
    filepath: string
  ): Promise<ImageFileRecord | null>;
  deleteImageFile(id: string): Promise<ImageFileRecord | null>;
};
