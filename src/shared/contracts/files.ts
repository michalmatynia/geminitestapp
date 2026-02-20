import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * File Contracts
 */
export const fileSchema = namedDtoSchema.extend({
  filename: z.string(),
  filepath: z.string(),
  mimetype: z.string(),
  size: z.number(),
  extension: z.string().optional(),
  publicUrl: z.string().optional(),
  storageProvider: z.enum(['local', 's3', 'imagekit']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type FileDto = z.infer<typeof fileSchema>;

export const uploadFileSchema = fileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UploadFileDto = z.infer<typeof uploadFileSchema>;

export const updateFileSchema = uploadFileSchema.partial();

export type UpdateFileDto = z.infer<typeof updateFileSchema>;

/**
 * Image File Contracts
 */
export const imageFileSchema = fileSchema.extend({
  width: z.number().optional(),
  height: z.number().optional(),
  thumbnailPath: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isAnimated: z.boolean().optional(),
  hasAlpha: z.boolean().optional(),
  blurHash: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type ImageFileDto = z.infer<typeof imageFileSchema>;

export const imageFileRecordSchema = imageFileSchema.extend({
  // Added fields specific to DB record if needed
});

export type ImageFileRecordDto = z.infer<typeof imageFileRecordSchema>;
export type ImageFileRecord = ImageFileRecordDto;

export const imageFileSelectionSchema = z.object({
  id: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  filename: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export type ImageFileSelectionDto = z.infer<typeof imageFileSelectionSchema>;
export type ImageFileSelection = ImageFileSelectionDto;

export const imageFileCreateInputSchema = imageFileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().optional(),
  publicUrl: z.string().optional(),
  storageProvider: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ImageFileCreateInputDto = z.infer<typeof imageFileCreateInputSchema>;
export type ImageFileCreateInput = ImageFileCreateInputDto;

export const imageFileListFiltersSchema = z.object({
  search: z.string().optional(),
  filename: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mimetypes: z.array(z.string()).optional(),
});

export type ImageFileListFiltersDto = z.infer<typeof imageFileListFiltersSchema>;
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
