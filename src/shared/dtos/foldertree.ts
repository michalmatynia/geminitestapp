// Folder Tree DTOs
export interface FolderTreeNodeDto {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  path: string;
  size: number | null;
  mimeType: string | null;
  children: FolderTreeNodeDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderDto {
  name: string;
  parentId?: string;
}

export interface UpdateFolderDto {
  name?: string;
  parentId?: string;
}

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
