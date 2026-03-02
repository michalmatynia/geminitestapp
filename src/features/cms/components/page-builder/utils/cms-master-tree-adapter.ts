import { createMasterFolderTreeAdapterV3 } from '@/features/foldertree/v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { decodeCmsMasterNodeId, fromCmsZoneNodeId } from './cms-master-tree';

import type { PageZone } from '../../../types/page-builder';

export const createCmsMasterTreeAdapter = (
  applySectionMoveByZoneIndex: (sectionId: string, zone: PageZone, toIndex: number) => void
) =>
  createMasterFolderTreeAdapterV3({
    decodeNodeId: decodeCmsMasterNodeId,
    handlers: {
      onMove: ({ operation, context, node, targetParent }): void => {
        if (node.entity !== 'section' || targetParent?.entity !== 'zone') return;

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
        const targetZone = fromCmsZoneNodeId(targetParent.nodeId);
        if (!targetZone) return;
        applySectionMoveByZoneIndex(node.id, targetZone, targetIndex);
      },
      onReorder: ({ operation, context, node, target }): void => {
        if (node.entity !== 'section' || target.entity !== 'section') return;
        const targetNode = context.previousNodes.find(
          (entry: MasterTreeNode): boolean => entry.id === operation.targetId
        );
        const zone = targetNode?.parentId ? fromCmsZoneNodeId(targetNode.parentId) : null;
        if (!zone || !targetNode?.parentId) return;

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
        applySectionMoveByZoneIndex(node.id, zone, dropIndex);
      },
    },
  });
