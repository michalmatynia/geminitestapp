import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Asset 3D Contracts
 */

export const asset3dCategorySchema = namedDtoSchema.extend({
  description: z.string().nullable(),
});

export type Asset3dCategoryDto = z.infer<typeof asset3dCategorySchema>;

export const asset3dTagSchema = namedDtoSchema.extend({
  color: z.string().nullable(),
});

export type Asset3dTagDto = z.infer<typeof asset3dTagSchema>;

export const asset3dViewerConfigSchema = z.object({
  autoRotate: z.boolean(),
  autoRotateSpeed: z.number(),
  exposure: z.number(),
  environmentImage: z.string().nullable(),
  backgroundColor: z.string().nullable(),
  showGrid: z.boolean(),
  showAxes: z.boolean(),
});

export type Asset3dViewerConfigDto = z.infer<typeof asset3dViewerConfigSchema>;

export const asset3dSchema = namedDtoSchema.extend({
  description: z.string().nullable(),
  fileId: z.string(),
  thumbnailId: z.string().nullable(),
  categoryId: z.string().nullable(),
  tagIds: z.array(z.string()),
  viewerConfig: asset3dViewerConfigSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Asset3dDto = z.infer<typeof asset3dSchema>;
export type Asset3DRecord = Asset3dDto;

export const createAsset3dSchema = asset3dSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Asset3dCreateInput = z.infer<typeof createAsset3dSchema>;
export type Asset3DCreateInput = Asset3dCreateInput;

export const updateAsset3dSchema = createAsset3dSchema.partial();

export type Asset3dUpdateInput = z.infer<typeof updateAsset3dSchema>;
export type Asset3DUpdateInput = Asset3dUpdateInput;

export const asset3dListFiltersSchema = z.object({
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  search: z.string().optional(),
});

export type Asset3dListFiltersDto = z.infer<typeof asset3dListFiltersSchema>;
export type Asset3DListFilters = Asset3dListFiltersDto;
