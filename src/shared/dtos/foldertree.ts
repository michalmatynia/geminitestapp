import { DtoBase, CreateDto, UpdateDto } from '../types/base';

// Folder Tree DTOs
export interface FolderTreeNodeDto extends DtoBase {
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  path: string;
  size: number | null;
  mimeType: string | null;
  children: FolderTreeNodeDto[];
}

export type CreateFolderDto = CreateDto<FolderTreeNodeDto>;
export type UpdateFolderDto = UpdateDto<FolderTreeNodeDto>;

export interface MoveFolderDto {
  id: string;
  newParentId: string | null;
}

export interface FolderTreeStatsDto {
  totalFolders: number;
  totalFiles: number;
  totalSize: number;
  maxDepth: number;
}
