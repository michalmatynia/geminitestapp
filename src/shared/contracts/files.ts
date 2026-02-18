import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * File DTOs
 */

export const fileSchema = dtoBaseSchema.extend({
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  path: z.string(),
  url: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type FileDto = z.infer<typeof fileSchema>;

export const updateFileSchema = fileSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdateFileDto = z.infer<typeof updateFileSchema>;

/**
 * Image File DTO
 */

export const imageFileSchema = fileSchema.extend({
  width: z.number(),
  height: z.number(),
  alt: z.string().optional(),
  thumbnailUrl: z.string().optional(),
});

export type ImageFileDto = z.infer<typeof imageFileSchema>;

export const updateImageFileSchema = imageFileSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdateImageFileDto = z.infer<typeof updateImageFileSchema>;

export const imageFileRecordSchema = dtoBaseSchema.extend({
  filename: z.string(),
  filepath: z.string(),
  mimetype: z.string(),
  size: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  tags: z.array(z.string()),
  name: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  description: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type ImageFileRecordDto = z.infer<typeof imageFileRecordSchema>;

export const imageFileSelectionSchema = z.object({
  id: z.string(),
  filepath: z.string(),
});

export type ImageFileSelectionDto = z.infer<typeof imageFileSelectionSchema>;

export const imageFileListFiltersSchema = z.object({
  filename: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export type ImageFileListFiltersDto = z.infer<typeof imageFileListFiltersSchema>;

/**
 * Upload DTOs
 */

// Note: File object is a browser native, so we use z.any() or z.instanceof(File)
export const uploadFileSchema = z.object({
  file: z.any(),
  alt: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UploadFileDto = {
  file: File;
  alt?: string;
  metadata?: Record<string, unknown>;
};

export const fileUploadResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  size: z.number(),
});

export type FileUploadResponseDto = z.infer<typeof fileUploadResponseSchema>;
