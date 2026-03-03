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

export type Asset3DRecord = z.infer<typeof asset3DRecordSchema>;

export const asset3DCreateInputSchema = asset3DRecordSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    description: z.string().nullable().optional(),
    fileId: z.string().optional(),
    thumbnailId: z.string().nullable().optional(),
    tagIds: z.array(z.string()).optional(),
    filename: z.string().optional(),
    filepath: z.string().optional(),
    mimetype: z.string().optional(),
    size: z.number().optional(),
  });

export type Asset3DCreateInput = z.infer<typeof asset3DCreateInputSchema>;

export const asset3DUpdateInputSchema = asset3DCreateInputSchema.partial();

export type Asset3DUpdateInput = z.infer<typeof asset3DUpdateInputSchema>;

export const asset3DListFiltersSchema = z.object({
  categoryId: z.string().nullable().optional(),
  tagId: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  filename: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export type Asset3DListFilters = z.infer<typeof asset3DListFiltersSchema>;

export const asset3dOrderedDitheringPresetKeySchema = z.enum([
  'balanced',
  'fineMono',
  'chunkyMono',
  'inverted',
  'custom',
]);

export type Asset3dOrderedDitheringPresetKey = z.infer<
  typeof asset3dOrderedDitheringPresetKeySchema
>;

export const asset3dLightingPresetSchema = z.enum(['studio', 'outdoor', 'dramatic', 'soft']);
export type Asset3dLightingPreset = z.infer<typeof asset3dLightingPresetSchema>;

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
  'dawn',
]);
export type Asset3dEnvironmentPreset = z.infer<typeof asset3dEnvironmentPresetSchema>;

export const asset3dViewModeSchema = z.enum(['grid', 'list']);
export type Asset3dViewMode = z.infer<typeof asset3dViewModeSchema>;

/**
 * 3D Viewer State Contracts
 */

export const viewer3DStateSchema = z.object({
  // View settings
  autoRotate: z.boolean(),
  autoRotateSpeed: z.number(),

  // Environment & Lighting
  environment: asset3dEnvironmentPresetSchema,
  lighting: asset3dLightingPresetSchema,
  lightIntensity: z.number(),

  // Rendering
  enableShadows: z.boolean(),
  enableContactShadows: z.boolean(),
  showGround: z.boolean(),

  // Post-processing
  enableBloom: z.boolean(),
  bloomIntensity: z.number(),
  enableVignette: z.boolean(),
  enableToneMapping: z.boolean(),
  exposure: z.number(),

  // Dithering (special effect)
  enableDithering: z.boolean(),
  ditheringIntensity: z.number(),

  // Pixelation (pixel art effect)
  enablePixelation: z.boolean(),
  pixelSize: z.number(),

  // Ordered dithering shader
  enableOrderedDithering: z.boolean(),
  orderedDitheringGridSize: z.number(),
  orderedDitheringPixelSizeRatio: z.number(),
  orderedDitheringGrayscaleOnly: z.boolean(),
  orderedDitheringInvertColor: z.boolean(),
  orderedDitheringLuminanceMethod: z.number(),
  orderedDitheringPreset: asset3dOrderedDitheringPresetKeySchema,

  // Background
  backgroundColor: z.string(),
});

export type Viewer3DStateDto = z.infer<typeof viewer3DStateSchema>;
export type Viewer3DState = Viewer3DStateDto;

export type Viewer3DTransform = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

export type Viewer3DSettings = Partial<Viewer3DState> & {
  enableAntiAliasing?: boolean;
  transform?: Viewer3DTransform;
};

export type Supported3DExtension = '.glb' | '.gltf';

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
