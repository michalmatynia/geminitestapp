import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { NodeFileDocumentSearchRow } from '../components/CaseResolverNodeFileUtils';

export type RelationBrowserMode = 'link_relations' | 'add_to_node_canvas';

export type RelationTreeInstance = Extract<
  FolderTreeInstance,
  | 'case_resolver_document_relations'
  | 'case_resolver_nodefile_relations'
  | 'case_resolver_scanfile_relations'
>;

export type RelationTreeNodeType = 'case' | 'folder' | 'file';

export type RelationTreeNodeCaseMeta = {
  nodeType: 'case';
  caseId: string | null;
  signatureLabel: string;
};

export type RelationTreeNodeFolderMeta = {
  nodeType: 'folder';
  caseId: string | null;
  folderPath: string;
};

export type RelationTreeNodeFileMeta = {
  nodeType: 'file';
  fileId: string;
};

export type RelationTreeNodeMeta =
  | RelationTreeNodeCaseMeta
  | RelationTreeNodeFolderMeta
  | RelationTreeNodeFileMeta;

export type RelationTreeLookup = {
  fileRowByNodeId: Map<string, NodeFileDocumentSearchRow>;
  fileNodeIdByFileId: Map<string, string>;
  caseMetaByNodeId: Map<string, RelationTreeNodeCaseMeta>;
  folderMetaByNodeId: Map<string, RelationTreeNodeFolderMeta>;
};

export type RelationTreeBuildResult = {
  nodes: MasterTreeNode[];
  lookup: RelationTreeLookup;
};
