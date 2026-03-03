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

export type FileRecord = z.infer<typeof fileSchema>;

export const uploadFileSchema = fileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;

export const updateFileSchema = uploadFileSchema.partial();

export type UpdateFileInput = z.infer<typeof updateFileSchema>;

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

export type ImageFile = z.infer<typeof imageFileSchema>;

export const imageFileRecordSchema = imageFileSchema.extend({
  // Added fields specific to DB record if needed
});

export interface ImageFileRecord {
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

export const imageFileSelectionSchema = z.object({
  id: z.string(),
  url: z.string().optional(),
  filepath: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  filename: z.string().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});

export type ImageFileSelection = z.infer<typeof imageFileSelectionSchema>;

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

export type ImageFileCreateInput = z.infer<typeof imageFileCreateInputSchema>;

export const imageFileUpdateInputSchema = imageFileCreateInputSchema.partial();
export type ImageFileUpdateInput = z.infer<typeof imageFileUpdateInputSchema>;

export const imageFileListFiltersSchema = z.object({
  search: z.string().optional(),
  filename: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mimetypes: z.array(z.string()).optional(),
});

export type ImageFileListFilters = z.infer<typeof imageFileListFiltersSchema>;

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

/**
 * File Upload Event Contracts
 */
export const fileUploadEventStatusSchema = z.enum(['success', 'error']);
export type FileUploadEventStatus = z.infer<typeof fileUploadEventStatusSchema>;

export const fileUploadEventSchema = z.object({
  id: z.string(),
  status: fileUploadEventStatusSchema,
  category: z.string().nullable(),
  projectId: z.string().nullable(),
  folder: z.string().nullable(),
  filename: z.string().nullable(),
  filepath: z.string().nullable(),
  mimetype: z.string().nullable(),
  size: z.number().nullable(),
  source: z.string().nullable(),
  errorMessage: z.string().nullable(),
  requestId: z.string().nullable(),
  userId: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.union([z.string(), z.date()]),
});

export type FileUploadEventRecord = z.infer<typeof fileUploadEventSchema>;

export const fileUploadEventsResponseSchema = z.object({
  events: z.array(fileUploadEventSchema).optional(),
  total: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export type FileUploadEventsResponse = z.infer<typeof fileUploadEventsResponseSchema>;

export const fileUploadEventsFiltersSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  status: z.enum(['success', 'error', 'all']).optional(),
  category: z.string().optional(),
  projectId: z.string().optional(),
  query: z.string().optional(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
});

export type FileUploadEventsFilters = z.infer<typeof fileUploadEventsFiltersSchema>;

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
