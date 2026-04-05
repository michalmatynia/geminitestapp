import type { PageZone } from '@/features/cms/types/page-builder';
import { createMasterFolderTreeAdapterV3 } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { decodeCmsMasterNodeId, fromCmsSectionNodeId, fromCmsZoneNodeId } from './cms-master-tree';


export const createCmsMasterTreeAdapter = (
  applySectionMoveInTree: (
    sectionId: string,
    toZone: PageZone,
    toParentSectionId: string | null,
    toIndex: number
  ) => void
) =>
  createMasterFolderTreeAdapterV3({
    decodeNodeId: decodeCmsMasterNodeId,
    handlers: {
      onMove: ({ operation, context, node, targetParent }): void => {
        if (node.entity !== 'section' || !targetParent) return;
        if (targetParent.entity !== 'zone' && targetParent.entity !== 'section') return;

        const nextSections = context.nextNodes
          .filter(
            (entry: MasterTreeNode): boolean =>
              entry.parentId === targetParent.nodeId && entry.kind === 'section'
          )
          .sort((left: MasterTreeNode, right: MasterTreeNode) => left.sortOrder - right.sortOrder);
        const derivedIndex = nextSections.findIndex(
          (entry: MasterTreeNode): boolean => entry.id === node.nodeId
        );
        const targetIndex = operation.targetIndex ?? derivedIndex;
        if (targetIndex < 0) return;

        if (targetParent.entity === 'zone') {
          const targetZone = extractPageZone(targetParent.id);
          if (!targetZone) return;
          applySectionMoveInTree(node.id, targetZone, null, targetIndex);
          return;
        }

        const parentSectionId = targetParent.id;
        const targetZone = resolveZoneForParentNode(context.nextNodes, targetParent.nodeId);
        if (!targetZone) return;
        applySectionMoveInTree(node.id, targetZone, parentSectionId, targetIndex);
      },
      onReorder: ({ operation, context, node, target }): void => {
        if (node.entity !== 'section' || target.entity !== 'section') return;
        const targetNode = context.previousNodes.find(
          (entry: MasterTreeNode): boolean => entry.id === operation.targetId
        );
        if (!targetNode?.parentId) return;

        const currentSections = context.previousNodes
          .filter(
            (entry: MasterTreeNode): boolean =>
              entry.parentId === targetNode.parentId && entry.kind === 'section'
          )
          .sort((left: MasterTreeNode, right: MasterTreeNode) => left.sortOrder - right.sortOrder);
        const targetIndex = currentSections.findIndex(
          (entry: MasterTreeNode): boolean => entry.id === target.nodeId
        );
        if (targetIndex < 0) return;

        const dropIndex = operation.position === 'after' ? targetIndex + 1 : targetIndex;
        const parentZone = fromCmsZoneNodeId(targetNode.parentId);
        if (parentZone) {
          applySectionMoveInTree(node.id, parentZone, null, dropIndex);
          return;
        }

        const parentSectionId = fromCmsSectionNodeId(targetNode.parentId);
        if (!parentSectionId) return;
        const targetZone = resolveZoneForParentNode(context.previousNodes, targetNode.parentId);
        if (!targetZone) return;
        applySectionMoveInTree(node.id, targetZone, parentSectionId, dropIndex);
      },
    },
  });

const resolveZoneForParentNode = (
  nodes: MasterTreeNode[],
  parentNodeId: string
): PageZone | null => {
  const zoneFromId = fromCmsZoneNodeId(parentNodeId);
  if (zoneFromId) return zoneFromId;

  const parentNode = nodes.find((entry: MasterTreeNode): boolean => entry.id === parentNodeId);
  if (!parentNode) return null;
  const metadataZone = extractPageZone(parentNode.metadata?.['zone']);
  if (metadataZone) return metadataZone;

  const pathRoot = parentNode.path.split('/')[0] ?? '';
  return extractPageZone(pathRoot);
};

const extractPageZone = (value: unknown): PageZone | null => {
  if (value === 'header' || value === 'template' || value === 'footer') return value;
  return null;
};
