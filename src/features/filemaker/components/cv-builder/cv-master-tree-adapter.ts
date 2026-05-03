import type { MasterFolderTreeAdapterV3 } from '@/shared/contracts/master-folder-tree';
import { createMasterFolderTreeAdapterV3 } from '@/shared/lib/foldertree/public';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { CvBlock } from './cv-block-model';
import { applyTreeMutationToCvBlocks } from './cv-master-tree';

export type CvBlockEntity = 'block';

interface CvMasterTreeAdapterInput {
  getBlocks: () => CvBlock[];
  setBlocks: (next: CvBlock[]) => void;
}

export type CvMasterNodeIdentity = {
  entity: CvBlockEntity;
  id: MasterTreeId;
  nodeId: MasterTreeId;
};

export const decodeCvMasterNodeId = (nodeId: MasterTreeId): CvMasterNodeIdentity => ({
  entity: 'block' as const,
  id: nodeId,
  nodeId,
});

export const createCvMasterTreeAdapter = (
  input: CvMasterTreeAdapterInput
): MasterFolderTreeAdapterV3 => {
  const persistFromContext = (nextNodes: MasterTreeNode[]): void => {
    const next = applyTreeMutationToCvBlocks(input.getBlocks(), nextNodes);
    input.setBlocks(next);
  };

  return createMasterFolderTreeAdapterV3<CvBlockEntity>({
    decodeNodeId: decodeCvMasterNodeId,
    handlers: {
      onMove: ({ context }): void => {
        persistFromContext(context.nextNodes);
      },
      onReorder: ({ context }): void => {
        persistFromContext(context.nextNodes);
      },
      onRename: ({ context }): void => {
        persistFromContext(context.nextNodes);
      },
      onReplaceNodes: ({ operation, context }): void => {
        if (operation.reason === 'external_sync') return;
        persistFromContext(context.nextNodes);
      },
    },
  });
};
