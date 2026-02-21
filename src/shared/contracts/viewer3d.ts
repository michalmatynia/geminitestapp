import { z } from 'zod';

import { namedDtoSchema } from './base';

/**
 * 3D Asset Contracts
 */

export const asset3DRecordSchema = namedDtoSchema.extend({
  description: z.string().nullable(),
  fileId: z.string().optional(),
  thumbnailId: z.string().nullable().optional(),
  categoryId: z.string().nullable(),
  tagIds: z.array(z.string()).optional(),
  fileUrl: z.string().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  filename: z.string().optional(),
  filepath: z.string().optional(),
  mimetype: z.string().optional(),
  size: z.number().optional(),
  fileSize: z.number().optional(),
  format: z.string().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  viewerConfig: z.record(z.string(), z.unknown()).optional(),
});

export type Asset3DRecordDto = z.infer<typeof asset3DRecordSchema>;
export type Asset3DRecord = Asset3DRecordDto;

export const asset3DCreateInputSchema = asset3DRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  description: z.string().nullable().optional(),
  fileId: z.string().optional(),
  thumbnailId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  filename: z.string().optional(),
  filepath: z.string().optional(),
  mimetype: z.string().optional(),
  size: z.number().optional(),
});

export type Asset3DCreateInputDto = z.infer<typeof asset3DCreateInputSchema>;
export type Asset3DCreateInput = Asset3DCreateInputDto;

export const asset3DUpdateInputSchema = asset3DCreateInputSchema.partial();

export type Asset3DUpdateInputDto = z.infer<typeof asset3DUpdateInputSchema>;
export type Asset3DUpdateInput = Asset3DUpdateInputDto;

export const asset3DListFiltersSchema = z.object({
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  filename: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export type Asset3DListFiltersDto = z.infer<typeof asset3DListFiltersSchema>;
export type Asset3DListFilters = Asset3DListFiltersDto;

export const asset3dOrderedDitheringPresetKeySchema = z.enum([
  'balanced',
  'fineMono',
  'chunkyMono',
  'inverted',
  'custom',
]);

export type Asset3dOrderedDitheringPresetKeyDto = z.infer<typeof asset3dOrderedDitheringPresetKeySchema>;

export const asset3dLightingPresetSchema = z.enum([
  'studio',
  'outdoor',
  'dramatic',
  'soft',
]);
export type Asset3dLightingPresetDto = z.infer<typeof asset3dLightingPresetSchema>;

export const asset3dEnvironmentPresetSchema = z.enum([
  'none',
  'studio',
  'city',
  'park',
  'lobby',
  'apartment',
  'gym',
  'night',
  'warehouse',
  'sunset',
  'forest',
]);
export type Asset3dEnvironmentPresetDto = z.infer<typeof asset3dEnvironmentPresetSchema>;

export const asset3dViewModeSchema = z.enum(['grid', 'list']);
export type Asset3dViewModeDto = z.infer<typeof asset3dViewModeSchema>;

export type Asset3dDto = Asset3DRecordDto;

/**
 * 3D Viewer Repository Interface
 */

export type Asset3DRepository = {
  createAsset(data: Asset3DCreateInput): Promise<Asset3DRecord>;
  createAsset3D(data: Asset3DCreateInput): Promise<Asset3DRecord>;
  getAssetById(id: string): Promise<Asset3DRecord | null>;
  getAsset3DById(id: string): Promise<Asset3DRecord | null>;
  listAssets(filters?: Asset3DListFilters): Promise<Asset3DRecord[]>;
  listAssets3D(filters?: Asset3DListFilters): Promise<Asset3DRecord[]>;
  updateAsset(id: string, data: Asset3DUpdateInput): Promise<Asset3DRecord | null>;
  updateAsset3D(id: string, data: Asset3DUpdateInput): Promise<Asset3DRecord | null>;
  deleteAsset(id: string): Promise<Asset3DRecord | null>;
  deleteAsset3D(id: string): Promise<Asset3DRecord | null>;
  getCategories(): Promise<unknown[]>;
  getTags(): Promise<unknown[]>;
};
