import type { 
  Asset3dDto, 
  Asset3dCategoryDto, 
  Asset3dTagDto, 
  Asset3dViewerConfigDto,
  Asset3dListFiltersDto
} from '../../contracts/viewer3d';

export type { 
  Asset3dDto, 
  Asset3dCategoryDto, 
  Asset3dTagDto, 
  Asset3dViewerConfigDto,
  Asset3dListFiltersDto
};

export type Asset3DRecord = Asset3dDto;

export type Asset3DCreateInput = Omit<Asset3dDto, 'id' | 'createdAt' | 'updatedAt'>;

export type Asset3DUpdateInput = Partial<Asset3DCreateInput>;

export type Asset3DListFilters = Asset3dListFiltersDto;
