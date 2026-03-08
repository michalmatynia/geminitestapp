import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  buildMasterCaseNodesFromCaseResolverWorkspace,
  buildMasterNodesFromCaseResolverWorkspace,
  fromCaseResolverCaseNodeId,
  fromCaseResolverFileNodeId,
  fromCaseResolverFolderNodeId,
  parseString,
  toCaseResolverFolderNodeId,
} from '../master-tree';

const CHILD_CASE_STRUCTURE_FOLDER_PATH = '__case_resolver_children_case_structure__';
export const CHILD_CASE_STRUCTURE_NODE_ID = toCaseResolverFolderNodeId(
  CHILD_CASE_STRUCTURE_FOLDER_PATH
);
const CHILD_CASE_STRUCTURE_METADATA_VALUE = 'children_case_structure';
const UNASSIGNED_FOLDER_PATH = '__case_resolver_unassigned__';
export const UNASSIGNED_NODE_ID = toCaseResolverFolderNodeId(UNASSIGNED_FOLDER_PATH);
const UNASSIGNED_METADATA_VALUE = 'unassigned';

export const isChildCaseStructureFolderPath = (folderPath: string): boolean =>
  folderPath.trim() === CHILD_CASE_STRUCTURE_FOLDER_PATH;

export const isChildCaseStructureNode = (
  node: Pick<MasterTreeNode, 'id' | 'metadata'>
): boolean =>
  isChildCaseStructureFolderPath(fromCaseResolverFolderNodeId(node.id) ?? '') ||
  parseString(node.metadata?.['virtualSection']) === CHILD_CASE_STRUCTURE_METADATA_VALUE;

export const isUnassignedFolderPath = (folderPath: string): boolean =>
  folderPath.trim() === UNASSIGNED_FOLDER_PATH;

export const isUnassignedNode = (node: Pick<MasterTreeNode, 'id' | 'metadata'>): boolean =>
  isUnassignedFolderPath(fromCaseResolverFolderNodeId(node.id) ?? '') ||
  parseString(node.metadata?.['virtualSection']) === UNASSIGNED_METADATA_VALUE;

export const isCaseResolverVirtualSectionNode = (
  node: Pick<MasterTreeNode, 'id' | 'metadata'>
): boolean => isChildCaseStructureNode(node) || isUnassignedNode(node);

export const resolveFolderAncestorNodeIds = (folderPath: string): string[] => {
  const normalizedFolder = folderPath.trim();
  if (!normalizedFolder) return [];
  const parts = normalizedFolder.split('/').filter(Boolean);
  return parts.map((_: string, index: number): string =>
    toCaseResolverFolderNodeId(parts.slice(0, index + 1).join('/'))
  );
};

export const areStringArraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((value: string, index: number): boolean => value === right[index]);

export const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export const resolveRequestedCaseResolverFileId = (requestedFileIdRaw: string | null): string | null => {
  const normalizedRequestedFileId = requestedFileIdRaw?.trim() ?? '';
  if (!normalizedRequestedFileId) return null;
  const decodedCaseNodeId = fromCaseResolverCaseNodeId(normalizedRequestedFileId);
  if (decodedCaseNodeId) return decodedCaseNodeId;
  const decodedFileNodeId = fromCaseResolverFileNodeId(normalizedRequestedFileId);
  if (decodedFileNodeId) return decodedFileId;
  return normalizedRequestedFileId;
};

export const resolveCaseResolverRootTreeNodes = ({
  workspace,
  activeCaseId,
}: {
  workspace: CaseResolverWorkspace;
  activeCaseId: string | null;
}): MasterTreeNode[] => {
  if (activeCaseId?.trim()) {
    return buildMasterNodesFromCaseResolverWorkspace(workspace);
  }
  return buildMasterCaseNodesFromCaseResolverWorkspace(workspace);
};
