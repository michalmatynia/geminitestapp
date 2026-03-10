import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';


import {
  buildRelationCaseNodeId,
  buildRelationCasePath,
  buildRelationFileNodeId,
  buildRelationFolderNodeId,
  buildRelationFolderPath,
  RELATION_TREE_UNASSIGNED_CASE_KEY,
} from './relation-master-tree.helpers';

import type {
  RelationCaseBucket,
  RelationMasterTreeBuildInput,
} from './relation-master-tree.types';
import type { NodeFileDocumentSearchRow } from '../../components/CaseResolverNodeFileUtils';
import type { RelationTreeBuildResult } from '../types';

const resolveCaseBucketKey = (caseId: string | null): string =>
  caseId?.trim() || RELATION_TREE_UNASSIGNED_CASE_KEY;

const resolveCaseLabel = (rows: NodeFileDocumentSearchRow[], caseId: string | null): string => {
  const firstSignature = rows
    .find((row) => row.signatureLabel.trim().length > 0)
    ?.signatureLabel.trim();
  if (firstSignature) return firstSignature;
  if (caseId?.trim()) return caseId.trim();
  return 'Unassigned';
};

const buildCaseBuckets = (rows: NodeFileDocumentSearchRow[]): RelationCaseBucket[] => {
  const bucketByKey = new Map<string, RelationCaseBucket>();
  rows.forEach((row) => {
    const normalizedCaseId = row.file.parentCaseId?.trim() || null;
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
    const leftId = left.caseId || '';
    const rightId = right.caseId || '';
    return leftId.localeCompare(rightId);
  });

  return buckets;
};

const ensureFolderNode = (input: {
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

const assignSiblingSortOrders = (
  nodesById: Map<string, MasterTreeNode>,
  fileOrderByNodeId: Map<string, number>
): void => {
  const childrenByParent = new Map<string | null, MasterTreeNode[]>();
  nodesById.forEach((node) => {
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  });

  childrenByParent.forEach((siblings) => {
    siblings.sort((left, right) => {
      const leftType = String(left.metadata?.['relationNodeType'] ?? '');
      const rightType = String(right.metadata?.['relationNodeType'] ?? '');
      const leftIsFile = leftType === 'file';
      const rightIsFile = rightType === 'file';
      if (leftIsFile !== rightIsFile) return leftIsFile ? 1 : -1;
      if (leftIsFile && rightIsFile) {
        const leftOrder = fileOrderByNodeId.get(left.id) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = fileOrderByNodeId.get(right.id) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      }
      const nameDelta = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
      if (nameDelta !== 0) return nameDelta;
      return left.id.localeCompare(right.id);
    });
    siblings.forEach((node, index) => {
      node.sortOrder = index;
    });
  });
};

export const buildRelationMasterTree = ({
  rows,
}: RelationMasterTreeBuildInput): RelationTreeBuildResult => {
  const nodesById = new Map<string, MasterTreeNode>();
  const fileRowByNodeId = new Map<string, NodeFileDocumentSearchRow>();
  const fileNodeIdByFileId = new Map<string, string>();
  const caseMetaByNodeId = new Map<
    string,
    {
      nodeType: 'case';
      caseId: string | null;
      signatureLabel: string;
    }
  >();
  const folderMetaByNodeId = new Map<
    string,
    {
      nodeType: 'folder';
      caseId: string | null;
      folderPath: string;
    }
  >();
  const visibleFileIdsInTreeOrder: string[] = [];
  const visibleFileIdSet = new Set<string>();
  const fileOrderByNodeId = new Map<string, number>();

  const caseBuckets = buildCaseBuckets(rows);
  caseBuckets.forEach((bucket) => {
    const caseNodeId = buildRelationCaseNodeId(bucket.caseId);
    const caseNode: MasterTreeNode = {
      id: caseNodeId,
      type: 'folder',
      kind: 'relation_case',
      parentId: null,
      name: bucket.signatureLabel,
      path: buildRelationCasePath(bucket.caseId),
      sortOrder: 0,
      metadata: {
        relationNodeType: 'case',
        caseId: bucket.caseId,
        signatureLabel: bucket.signatureLabel,
      },
    };
    nodesById.set(caseNodeId, caseNode);
    caseMetaByNodeId.set(caseNodeId, {
      nodeType: 'case',
      caseId: bucket.caseId,
      signatureLabel: bucket.signatureLabel,
    });

    bucket.rows.forEach((row) => {
      let parentId = caseNodeId;
      let folderPathCursor = '';
      row.folderSegments.forEach((segment) => {
        folderPathCursor = folderPathCursor ? `${folderPathCursor}/${segment}` : segment;
        const folderNode = ensureFolderNode({
          nodesById,
          parentId,
          caseId: bucket.caseId,
          folderPath: folderPathCursor,
          folderName: segment,
        });
        folderMetaByNodeId.set(folderNode.id, {
          nodeType: 'folder',
          caseId: bucket.caseId,
          folderPath: folderPathCursor,
        });
        parentId = folderNode.id;
      });

      const fileNodeId = buildRelationFileNodeId(row.file.id);
      const fileNode: MasterTreeNode = {
        id: fileNodeId,
        type: 'file',
        kind: 'relation_file',
        parentId,
        name: row.file.name,
        path: row.folderPath
          ? `${buildRelationCasePath(bucket.caseId)}/${row.folderPath}/${row.file.id}`
          : `${buildRelationCasePath(bucket.caseId)}/${row.file.id}`,
        sortOrder: 0,
        metadata: {
          relationNodeType: 'file',
          fileId: row.file.id,
        },
      };
      nodesById.set(fileNodeId, fileNode);
      fileRowByNodeId.set(fileNodeId, row);
      fileNodeIdByFileId.set(row.file.id, fileNodeId);
      if (!visibleFileIdSet.has(row.file.id)) {
        visibleFileIdSet.add(row.file.id);
        visibleFileIdsInTreeOrder.push(row.file.id);
      }
      fileOrderByNodeId.set(fileNodeId, visibleFileIdsInTreeOrder.length - 1);
    });
  });

  assignSiblingSortOrders(nodesById, fileOrderByNodeId);

  return {
    nodes: Array.from(nodesById.values()),
    lookup: {
      fileRowByNodeId,
      fileNodeIdByFileId,
      caseMetaByNodeId,
      folderMetaByNodeId,
    },
  };
};
