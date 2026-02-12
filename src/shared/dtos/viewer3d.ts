import { NamedDto, CreateDto, UpdateDto } from '../types/base';

// 3D Viewer DTOs
export interface Asset3dDto extends NamedDto {
  fileUrl: string;
  thumbnailUrl: string | null;
  fileSize: number;
  format: string;
  categoryId: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}

export type CreateAsset3dDto_Base = CreateDto<Asset3dDto>;
export type UpdateAsset3dDto = UpdateDto<Asset3dDto>;

export interface UploadAsset3dDto {
  name: string;
  description?: string;
  file: File;
  categoryId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface Asset3dCategoryDto extends NamedDto {
  parentId: string | null;
}

export type CreateAsset3dCategoryDto = CreateDto<Asset3dCategoryDto>;
export type UpdateAsset3dCategoryDto = UpdateDto<Asset3dCategoryDto>;

export interface Asset3dTagDto extends NamedDto {
  color: string | null;
}

export type CreateAsset3dTagDto = CreateDto<Asset3dTagDto>;
export type UpdateAsset3dTagDto = UpdateDto<Asset3dTagDto>;

export interface Asset3dViewerConfigDto {
  backgroundColor: string;
  enableControls: boolean;
  enableLighting: boolean;
  cameraPosition: { x: number; y: number; z: number };
  autoRotate: boolean;
}
