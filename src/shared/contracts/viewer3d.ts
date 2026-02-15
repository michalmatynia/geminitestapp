import { z } from 'zod';

import { namedDtoSchema } from './base';

/**
 * 3D Asset DTOs
 */

export const asset3dSchema = namedDtoSchema.extend({
  filename: z.string(),
  filepath: z.string(),
  mimetype: z.string(),
  size: z.number(),
  fileUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  fileSize: z.number(),
  format: z.string(),
  categoryId: z.string().nullable(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
  isPublic: z.boolean(),
});

export type Asset3dDto = z.infer<typeof asset3dSchema>;

export const createAsset3dSchema = asset3dSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAsset3dDto = z.infer<typeof createAsset3dSchema>;
export type Asset3dCreateInput = CreateAsset3dDto;
export type UpdateAsset3dDto = Partial<CreateAsset3dDto>;
export type Asset3dUpdateInput = UpdateAsset3dDto;

// Browser-native File object
export const uploadAsset3dSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  file: z.any(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UploadAsset3dDto = {
  name: string;
  description?: string;
  file: File;
  categoryId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

/**
 * 3D Category DTO
 */

export const asset3dCategorySchema = namedDtoSchema.extend({
  parentId: z.string().nullable(),
});

export type Asset3dCategoryDto = z.infer<typeof asset3dCategorySchema>;

export const createAsset3dCategorySchema = asset3dCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAsset3dCategoryDto = z.infer<typeof createAsset3dCategorySchema>;
export type UpdateAsset3dCategoryDto = Partial<CreateAsset3dCategoryDto>;

/**
 * 3D Tag DTO
 */

export const asset3dTagSchema = namedDtoSchema.extend({
  color: z.string().nullable(),
});

export type Asset3dTagDto = z.infer<typeof asset3dTagSchema>;

export const createAsset3dTagSchema = asset3dTagSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAsset3dTagDto = z.infer<typeof createAsset3dTagSchema>;
export type UpdateAsset3dTagDto = Partial<CreateAsset3dTagDto>;

/**
 * 3D Viewer Config DTO
 */

export const asset3dViewerConfigSchema = z.object({
  backgroundColor: z.string(),
  enableControls: z.boolean(),
  enableLighting: z.boolean(),
  cameraPosition: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  autoRotate: z.boolean(),
});

export type Asset3dViewerConfigDto = z.infer<typeof asset3dViewerConfigSchema>;
