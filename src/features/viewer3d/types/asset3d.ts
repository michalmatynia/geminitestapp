export interface Asset3DRecord {
  id: string;
  name: string | null;
  description: string | null;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  tags: string[];
  category: string | null;
  metadata: Record<string, unknown> | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset3DCreateInput {
  name?: string | null;
  description?: string | null;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  tags?: string[];
  category?: string | null;
  metadata?: Record<string, unknown> | null;
  isPublic?: boolean;
}

export interface Asset3DUpdateInput {
  name?: string | null;
  description?: string | null;
  tags?: string[];
  category?: string | null;
  metadata?: Record<string, unknown> | null;
  isPublic?: boolean;
}

export interface Asset3DListFilters {
  filename?: string | null;
  category?: string | null;
  tags?: string[];
  isPublic?: boolean;
  search?: string | null;
}

export interface Asset3DRepository {
  createAsset3D(data: Asset3DCreateInput): Promise<Asset3DRecord>;
  getAsset3DById(id: string): Promise<Asset3DRecord | null>;
  listAssets3D(filters?: Asset3DListFilters): Promise<Asset3DRecord[]>;
  updateAsset3D(id: string, data: Asset3DUpdateInput): Promise<Asset3DRecord | null>;
  deleteAsset3D(id: string): Promise<Asset3DRecord | null>;
  getCategories(): Promise<string[]>;
  getTags(): Promise<string[]>;
}
