import type {
  MasterFolderTreeActionResult,
  MasterFolderTreeController,
} from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';

export type BulkOperationResult = {
  succeeded: MasterTreeId[];
  failed: Array<{ nodeId: MasterTreeId; reason: string }>;
};

/**
 * Moves multiple nodes to a single target parent in sequence.
 * Each move goes through the full adapter transaction pipeline.
 * Continues past failures by default; set `stopOnFirstFailure` to abort early.
 */
export const bulkMoveNodes = async ({
  nodeIds,
  targetParentId,
  controller,
  stopOnFirstFailure = false,
}: {
  nodeIds: MasterTreeId[];
  targetParentId: MasterTreeId | null;
  controller: MasterFolderTreeController;
  stopOnFirstFailure?: boolean | undefined;
}): Promise<BulkOperationResult> => {
  const succeeded: MasterTreeId[] = [];
  const failed: Array<{ nodeId: MasterTreeId; reason: string }> = [];

  for (const nodeId of nodeIds) {
    const result: MasterFolderTreeActionResult = await controller.moveNode(nodeId, targetParentId);
    if (result.ok) {
      succeeded.push(nodeId);
    } else {
      failed.push({
        nodeId,
        reason: result.error?.message ?? 'Move failed.',
      });
      if (stopOnFirstFailure) break;
    }
  }

  return { succeeded, failed };
};

/**
 * Deletes multiple nodes in sequence by delegating to a consumer-supplied
 * `onDeleteSingle` callback (the engine does not own delete).
 * After each successful delete, the tree state is expected to be updated
 * externally via `controller.replaceNodes` or equivalent.
 */
export const bulkDeleteNodes = async ({
  nodeIds,
  onDeleteSingle,
  stopOnFirstFailure = false,
}: {
  nodeIds: MasterTreeId[];
  controller: MasterFolderTreeController;
  onDeleteSingle: (nodeId: MasterTreeId) => Promise<MasterFolderTreeActionResult>;
  stopOnFirstFailure?: boolean | undefined;
}): Promise<BulkOperationResult> => {
  const succeeded: MasterTreeId[] = [];
  const failed: Array<{ nodeId: MasterTreeId; reason: string }> = [];

  for (const nodeId of nodeIds) {
    const result = await onDeleteSingle(nodeId);
    if (result.ok) {
      succeeded.push(nodeId);
    } else {
      failed.push({
        nodeId,
        reason: result.error?.message ?? 'Delete failed.',
      });
      if (stopOnFirstFailure) break;
    }
  }

  return { succeeded, failed };
};
