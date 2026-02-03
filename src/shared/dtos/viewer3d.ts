import { NamedDto } from '../types/base';

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

export interface Asset3dCategoryDto extends NamedDto {
  parentId: string | null;
}

export interface Asset3dTagDto extends NamedDto {
  color: string | null;
}

export interface CreateAsset3dDto {
  name: string;
  description?: string;
  file: File;
  categoryId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateAsset3dDto {
  name?: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface Asset3dViewerConfigDto {
  backgroundColor: string;
  enableControls: boolean;
  enableLighting: boolean;
  cameraPosition: { x: number; y: number; z: number };
  autoRotate: boolean;
}
