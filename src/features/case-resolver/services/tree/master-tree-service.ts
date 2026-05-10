/**
 * Master Tree Service
 * 
 * Provides utilities for generating and managing the hierarchical master tree
 * representation of a CaseResolver workspace.
 */

import type { DecodedMasterTreeNode as SharedDecodedMasterTreeNode } from '@/shared/contracts/master-folder-tree';

// Node ID prefixes
export const FOLDER_NODE_PREFIX = 'folder:';
export const FILE_NODE_PREFIX = 'file:';
export const ASSET_NODE_PREFIX = 'asset:';
export const CASE_NODE_PREFIX = 'case:';
export const CASE_CONTENT_FOLDER_NODE_PREFIX = 'case_content_folder:';
export const CASE_CONTENT_FILE_NODE_PREFIX = 'case_content_file:';
export const CASE_CONTENT_NODE_SEPARATOR = '::';

export type CaseResolverCaseMasterNodeRef = SharedDecodedMasterTreeNode<'case'>;

export type CaseResolverCaseContentFolderMasterNodeRef = {
  entity: 'case_content_folder';
  caseId: string;
  folderPath: string;
  nodeId: string;
};

export type CaseResolverCaseContentFileMasterNodeRef = {
  entity: 'case_content_file';
  caseId: string;
  fileId: string;
  nodeId: string;
};

/**
 * Generates stable IDs for master tree nodes.
 */
export const toCaseResolverFolderNodeId = (folderPath: string): string =>
  `${FOLDER_NODE_PREFIX}${folderPath}`;

export const toCaseResolverFileNodeId = (fileId: string): string => `${FILE_NODE_PREFIX}${fileId}`;

export const toCaseResolverAssetNodeId = (assetId: string): string =>
  `${ASSET_NODE_PREFIX}${assetId}`;

export const toCaseResolverCaseNodeId = (caseId: string): string => `${CASE_NODE_PREFIX}${caseId}`;

export const toCaseResolverCaseContentFolderNodeId = (caseId: string, folderPath: string): string =>
  `${CASE_CONTENT_FOLDER_NODE_PREFIX}${encodeURIComponent(caseId)}${CASE_CONTENT_NODE_SEPARATOR}${encodeURIComponent(folderPath)}`;

export const toCaseResolverCaseContentFileNodeId = (caseId: string, fileId: string): string =>
  `${CASE_CONTENT_FILE_NODE_PREFIX}${encodeURIComponent(caseId)}${CASE_CONTENT_NODE_SEPARATOR}${encodeURIComponent(fileId)}`;

/**
 * Decodes master tree node IDs back into their original identifiers.
 */
export const fromCaseResolverFolderNodeId = (value: string): string | null =>
  value.startsWith(FOLDER_NODE_PREFIX) ? value.slice(FOLDER_NODE_PREFIX.length) : null;

export const fromCaseResolverFileNodeId = (value: string): string | null =>
  value.startsWith(FILE_NODE_PREFIX) ? value.slice(FILE_NODE_PREFIX.length) : null;

export const fromCaseResolverAssetNodeId = (value: string): string | null =>
  value.startsWith(ASSET_NODE_PREFIX) ? value.slice(ASSET_NODE_PREFIX.length) : null;

export const fromCaseResolverCaseNodeId = (value: string): string | null =>
  value.startsWith(CASE_NODE_PREFIX) ? value.slice(CASE_NODE_PREFIX.length) : null;

export const decodeCaseContentNodePayload = (value: string, prefix: string): [string, string] | null => {
  if (!value.startsWith(prefix)) return null;
  const payload = value.slice(prefix.length);
  const separatorIndex = payload.indexOf(CASE_CONTENT_NODE_SEPARATOR);
  if (separatorIndex <= 0) return null;
  const left = payload.slice(0, separatorIndex);
  const right = payload.slice(separatorIndex + CASE_CONTENT_NODE_SEPARATOR.length);
  if (left.length === 0 || right.length === 0) return null;
  try {
    return [decodeURIComponent(left), decodeURIComponent(right)];
  } catch {
    return null;
  }
};

export const fromCaseResolverCaseContentFolderNodeId = (value: string): [string, string] | null =>
  decodeCaseContentNodePayload(value, CASE_CONTENT_FOLDER_NODE_PREFIX);

export const fromCaseResolverCaseContentFileNodeId = (value: string): [string, string] | null =>
  decodeCaseContentNodePayload(value, CASE_CONTENT_FILE_NODE_PREFIX);
