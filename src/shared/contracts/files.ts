import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * File Contracts
 */
export const fileSchema = dtoBaseSchema.extend({
  filename: z.string(),
  filepath: z.string(),
  mimetype: z.string(),
  size: z.number(),
  name: z.string().optional(),
  extension: z.string().optional(),
  publicUrl: z.string().optional(),
  url: z.string().optional(),
  storageProvider: z.enum(['local', 's3', 'imagekit']).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
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
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  url: z.string().optional(),
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

export interface ImageFileRecordDto {
  id: string;
  name?: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  extension?: string;
  publicUrl?: string;
  url?: string;
  storageProvider?: 'local' | 's3' | 'imagekit';
  metadata?: Record<string, unknown> | null;
  width?: number | null;
  height?: number | null;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  isAnimated?: boolean;
  hasAlpha?: boolean;
  blurHash?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string | null;
}

export type ImageFileRecord = ImageFileRecordDto;

export const imageFileSelectionSchema = z.object({
  id: z.string(),
  url: z.string().optional(),
  filepath: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  filename: z.string().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});

export type ImageFileSelectionDto = z.infer<typeof imageFileSelectionSchema>;
export type ImageFileSelection = ImageFileSelectionDto;

export const imageFileCreateInputSchema = imageFileSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    name: z.string().optional(),
    publicUrl: z.string().optional(),
    storageProvider: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  });

export type ImageFileCreateInputDto = z.infer<typeof imageFileCreateInputSchema>;
export type ImageFileCreateInput = ImageFileCreateInputDto;

export const imageFileUpdateInputSchema = imageFileCreateInputSchema.partial();
export type ImageFileUpdateInputDto = z.infer<typeof imageFileUpdateInputSchema>;
export type ImageFileUpdateInput = ImageFileUpdateInputDto;

export const imageFileListFiltersSchema = z.object({
  search: z.string().optional(),
  filename: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mimetypes: z.array(z.string()).optional(),
});

export type ImageFileListFiltersDto = z.infer<typeof imageFileListFiltersSchema>;
export type ImageFileListFilters = ImageFileListFiltersDto;

/**
 * Image Optimization DTOs
 */
export type ImageFormat = 'webp' | 'avif' | 'jpeg' | 'png';
export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

export type ImageSizeConfig = {
  width: number;
  height?: number;
  quality?: number;
};

export type OptimizationOptions = {
  formats?: ImageFormat[];
  sizes?: Partial<Record<ImageSize, ImageSizeConfig>>;
  quality?: number;
  progressive?: boolean;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  withoutEnlargement?: boolean;
};

export type OptimizedImageResult = {
  format: ImageFormat;
  size: ImageSize;
  buffer: Buffer;
  width: number;
  height: number;
  fileSize: number;
  url?: string;
  metadata?: Record<string, unknown>;
};

export type ImageFileRepository = {
  createImageFile(data: ImageFileCreateInput): Promise<ImageFileRecord>;
  getImageFileById(id: string): Promise<ImageFileRecord | null>;
  listImageFiles(filters?: ImageFileListFilters): Promise<ImageFileRecord[]>;
  findImageFilesByIds(ids: string[]): Promise<ImageFileRecord[]>;
  updateImageFilePath(id: string, filepath: string): Promise<ImageFileRecord | null>;
  updateImageFileTags(id: string, tags: string[]): Promise<ImageFileRecord | null>;
  updateImageFile(id: string, data: ImageFileUpdateInput): Promise<ImageFileRecord | null>;
  deleteImageFile(id: string): Promise<ImageFileRecord | null>;
};
