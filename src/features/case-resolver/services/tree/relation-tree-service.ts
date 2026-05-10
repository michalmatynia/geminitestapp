/**
 * Relation Tree Service
 * 
 * Provides utilities for generating and managing the hierarchical master tree
 * representation of case relations in the Case Resolver.
 */

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { NodeFileDocumentSearchRow } from '../../components/CaseResolverNodeFileUtils';
import {
  buildRelationFolderPath,
  buildRelationFolderNodeId,
  RELATION_TREE_UNASSIGNED_CASE_KEY,
} from './relation-master-tree.helpers';
import type { RelationCaseBucket } from './relation-master-tree.types';

/**
 * Resolves the lookup key for a case bucket.
 */
export const resolveCaseBucketKey = (caseId: string | null): string =>
  caseId?.trim() ?? RELATION_TREE_UNASSIGNED_CASE_KEY;

/**
 * Resolves the label for a case bucket, defaulting to 'Unassigned'.
 */
export const resolveCaseLabel = (rows: NodeFileDocumentSearchRow[], caseId: string | null): string => {
  const firstSignature = rows
    .find((row) => row.signatureLabel.trim().length > 0)
    ?.signatureLabel.trim();
  if (firstSignature !== undefined && firstSignature.length > 0) return firstSignature;
  const trimmedCaseId = caseId?.trim() ?? '';
  if (trimmedCaseId.length > 0) return trimmedCaseId;
  return 'Unassigned';
};

/**
 * Organizes search rows into case buckets.
 */
export const buildCaseBuckets = (rows: NodeFileDocumentSearchRow[]): RelationCaseBucket[] => {
  const bucketByKey = new Map<string, RelationCaseBucket>();
  rows.forEach((row) => {
    const trimmedCaseId = row.file.parentCaseId?.trim() ?? '';
    const normalizedCaseId = trimmedCaseId.length > 0 ? trimmedCaseId : null;
    const key = resolveCaseBucketKey(normalizedCaseId);
    const existing = bucketByKey.get(key);
    if (existing) {
      existing.rows.push(row);
      return;
    }
    bucketByKey.set(key, {
      caseId: normalizedCaseId,
      signatureLabel: '',
      rows: [row],
    });
  });

  const buckets = Array.from(bucketByKey.values()).map((bucket) => ({
    ...bucket,
    signatureLabel: resolveCaseLabel(bucket.rows, bucket.caseId),
  }));

  buckets.sort((left, right) => {
    const labelDelta = left.signatureLabel.localeCompare(right.signatureLabel, undefined, {
      sensitivity: 'base',
    });
    if (labelDelta !== 0) return labelDelta;
    const leftId = left.caseId ?? '';
    const rightId = right.caseId ?? '';
    return leftId.localeCompare(rightId);
  });

  return buckets;
};

/**
 * Ensures a folder node exists in the tree nodes map.
 */
export const ensureFolderNode = (input: {
  nodesById: Map<string, MasterTreeNode>;
  parentId: string;
  caseId: string | null;
  folderPath: string;
  folderName: string;
}): MasterTreeNode => {
  const folderNodeId = buildRelationFolderNodeId({
    caseId: input.caseId,
    folderPath: input.folderPath,
  });
  const existing = input.nodesById.get(folderNodeId);
  if (existing) return existing;

  const folderNode: MasterTreeNode = {
    id: folderNodeId,
    type: 'folder',
    kind: 'relation_folder',
    parentId: input.parentId,
    name: input.folderName,
    path: buildRelationFolderPath({
      caseId: input.caseId,
      folderPath: input.folderPath,
    }),
    sortOrder: 0,
    metadata: {
      relationNodeType: 'folder',
      caseId: input.caseId,
      folderPath: input.folderPath,
    },
  };
  input.nodesById.set(folderNodeId, folderNode);
  return folderNode;
};
