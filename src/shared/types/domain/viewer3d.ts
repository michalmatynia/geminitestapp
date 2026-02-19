import type { 
  Asset3dDto, 
  Asset3dCategoryDto, 
  Asset3dTagDto, 
  Asset3dViewerConfigDto,
  Asset3dListFiltersDto,
  Asset3dCreateInput,
  Asset3dUpdateInput
} from '../../contracts/viewer3d';

export type { 
  Asset3dDto, 
  Asset3dCategoryDto, 
  Asset3dTagDto, 
  Asset3dViewerConfigDto,
  Asset3dListFiltersDto,
  Asset3dCreateInput,
  Asset3dUpdateInput
};

export type Asset3DRecord = Asset3dDto;

export type Asset3DCreateInput = Asset3dCreateInput;

export type Asset3DUpdateInput = Asset3dUpdateInput;

export type Asset3DListFilters = Asset3dListFiltersDto;
