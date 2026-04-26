import { createMasterFolderTreeAdapterV3 } from '@/shared/lib/foldertree/public';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { EmailBlock } from './block-model';
import { applyTreeMutationToBlocks } from './email-master-tree';

export type EmailBlockEntity = 'block';

interface EmailMasterTreeAdapterInput {
  getBlocks: () => EmailBlock[];
  setBlocks: (next: EmailBlock[]) => void;
}

export const decodeEmailMasterNodeId = (nodeId: MasterTreeId) => ({
  entity: 'block' as const,
  id: nodeId,
  nodeId,
});

export const createEmailMasterTreeAdapter = (input: EmailMasterTreeAdapterInput) => {
  const persistFromContext = (nextNodes: MasterTreeNode[]): void => {
    const next = applyTreeMutationToBlocks(input.getBlocks(), nextNodes);
    input.setBlocks(next);
  };

  return createMasterFolderTreeAdapterV3<EmailBlockEntity>({
    decodeNodeId: decodeEmailMasterNodeId,
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
        // 'external_sync' means the parent already owns this state — do not echo it back.
        if (operation.reason === 'external_sync') return;
        persistFromContext(context.nextNodes);
      },
    },
  });
};
