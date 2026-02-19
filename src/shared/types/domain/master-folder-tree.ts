import type {
  MasterTreeNodeDto,
  MasterTreeViewNodeDto,
  MasterTreeBuildResultDto,
} from '../../contracts/master-folder-tree';

export type {
  MasterTreeNodeDto as MasterFolderTreeNodeDto,
  MasterTreeViewNodeDto,
  MasterTreeBuildResultDto,
};

export type MasterFolderTreeNode = MasterTreeNodeDto;

export type MasterFolderTreeViewNode = MasterTreeViewNodeDto;
