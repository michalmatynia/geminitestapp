import type { 
  Asset3DRecord, 
  Asset3DCreateInput, 
  Asset3DUpdateInput, 
  Asset3DListFilters 
} from '@/shared/types/domain/viewer3d';

export type { 
  Asset3DRecord, 
  Asset3DCreateInput, 
  Asset3DUpdateInput, 
  Asset3DListFilters 
};

export interface Asset3DRepository {
  createAsset3D(data: Asset3DCreateInput): Promise<Asset3DRecord>;
  getAsset3DById(id: string): Promise<Asset3DRecord | null>;
  listAssets3D(filters?: Asset3DListFilters): Promise<Asset3DRecord[]>;
  updateAsset3D(id: string, data: Asset3DUpdateInput): Promise<Asset3DRecord | null>;
  deleteAsset3D(id: string): Promise<Asset3DRecord | null>;
  getCategories(): Promise<string[]>;
  getTags(): Promise<string[]>;
}
