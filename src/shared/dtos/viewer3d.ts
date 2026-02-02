// 3D Viewer DTOs
export interface Asset3dDto {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileSize: number;
  format: string;
  categoryId: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Asset3dCategoryDto {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset3dTagDto {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
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
