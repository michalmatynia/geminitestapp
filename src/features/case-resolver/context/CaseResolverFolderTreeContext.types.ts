
import type {
  CaseResolverFile,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import type { MasterFolderTreeAdapterV3 } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { FolderCaseFileStats } from '../components/CaseResolverFolderTree.helpers';
import type { Dispatch, SetStateAction } from 'react';

export interface CaseResolverFolderTreeDataContextValue {
  masterNodes: MasterTreeNode[];
  treeWorkspace: CaseResolverWorkspace;
  selectedMasterNodeId: string | null;
  initialExpandedFolderNodeIds: string[];
  adapter: MasterFolderTreeAdapterV3;
  fileLockById: Map<string, boolean>;
  folderCaseFileStatsByPath: Map<string, FolderCaseFileStats>;
  nodeFileAssetIdsBySourceFileId: Map<string, string[]>;
  caseNameById: Map<string, string>;
  childCaseIdSet: Set<string>;
  fileOwnerCaseIdById: Map<string, string>;
  assetOwnerCaseIdById: Map<string, string>;
  folderOwnerCaseIdsByPath: Map<string, string[]>;
  activeCaseFile: CaseResolverFile | null;
  activeCaseChildCount: number;
  isNodeFileCanvasActive: boolean;
  selectedFolderForCreate: string | null;
  selectedFolderForFolderCreate: string | null;
}

export interface CaseResolverFolderTreeUiStateContextValue {
  showChildCaseFolders: boolean;
  highlightedNodeFileAssetIds: string[];
  highlightedNodeFileAssetIdSet: Set<string>;
  highlightedFolderAncestorNodeIds: string[];
}

export interface CaseResolverFolderTreeUiActionsContextValue {
  setShowChildCaseFolders: Dispatch<SetStateAction<boolean>>;
  setHighlightedNodeFileAssetIds: Dispatch<SetStateAction<string[]>>;
}

export type CaseResolverFolderTreeUiContextValue = CaseResolverFolderTreeUiStateContextValue &
  CaseResolverFolderTreeUiActionsContextValue;

export interface CaseResolverFolderTreeRuntimeResult {
  dataValue: CaseResolverFolderTreeDataContextValue;
  uiStateValue: CaseResolverFolderTreeUiStateContextValue;
}
