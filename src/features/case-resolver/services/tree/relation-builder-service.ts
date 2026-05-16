/**
 * Relation Tree Builder Service
 * 
 * Provides logic for building hierarchical master-tree representations 
 * of CaseResolver relation workspaces.
 */

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { NodeFileDocumentSearchRow } from '../../components/CaseResolverNodeFileUtils';
import type { RelationTreeBuildResult } from '../../relation-search/types';
import {
  buildCaseBuckets,
  ensureFolderNode,
} from '@/features/case-resolver/services/tree';
import {
  buildRelationCaseNodeId,
  buildRelationCasePath,
  buildRelationFileNodeId,
} from '@/features/case-resolver/services/tree/relation-tree-helpers';

/**
 * Assigns sort orders to tree nodes based on parent-child relations and content type.
 */
export const assignSiblingSortOrders = (
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

/**
 * Builds the master tree structure from a set of search rows.
 */
export const buildRelationMasterTree = (rows: NodeFileDocumentSearchRow[]): RelationTreeBuildResult => {
  const nodesById = new Map<string, MasterTreeNode>();
  const fileRowByNodeId = new Map<string, NodeFileDocumentSearchRow>();
  const fileNodeIdByFileId = new Map<string, string>();
  const caseMetaByNodeId = new Map<
    string,
    { nodeType: 'case'; caseId: string | null; signatureLabel: string }
  >();
  const folderMetaByNodeId = new Map<
    string,
    { nodeType: 'folder'; caseId: string | null; folderPath: string }
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
