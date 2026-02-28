import type {
  MasterFolderTreeActionResult,
  MasterFolderTreeController,
} from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';

export type MasterTreeClipboardOperation = 'cut' | 'copy';

export type MasterTreeClipboardEntry = {
  operation: MasterTreeClipboardOperation;
  nodeIds: MasterTreeId[];
  sourceInstanceId: string;
  capturedAt: number;
};

export type MasterTreePasteResult =
  | {
      ok: true;
      appliedMoves: Array<{ nodeId: MasterTreeId; targetParentId: MasterTreeId | null }>;
    }
  | {
      ok: false;
      reason: string;
    };

/**
 * Creates a clipboard entry for the given node IDs and operation.
 * Does NOT mutate any tree state — the caller is responsible for updating
 * `controller.setSelectedNodeIds` or similar visual indicators.
 */
export const captureMasterTreeClipboard = (
  nodeIds: MasterTreeId[],
  operation: MasterTreeClipboardOperation,
  sourceInstanceId: string
): MasterTreeClipboardEntry => ({
  operation,
  nodeIds: [...nodeIds],
  sourceInstanceId,
  capturedAt: Date.now(),
});

/**
 * Applies a paste operation from the clipboard to the target parent.
 * For `cut` operations, calls `controller.moveNode` for each node in order.
 * For `copy` operations, returns an error (deep copy requires server support).
 *
 * @param allowCrossInstance - Allow pasting from a different instance. Default false.
 */
export const applyMasterTreePaste = async ({
  clipboard,
  targetParentId,
  controller,
  allowCrossInstance = false,
  instanceId,
}: {
  clipboard: MasterTreeClipboardEntry;
  targetParentId: MasterTreeId | null;
  controller: MasterFolderTreeController;
  allowCrossInstance?: boolean | undefined;
  instanceId?: string | undefined;
}): Promise<MasterTreePasteResult> => {
  if (!allowCrossInstance && instanceId && clipboard.sourceInstanceId !== instanceId) {
    return {
      ok: false,
      reason: `Cross-instance paste blocked (source: ${clipboard.sourceInstanceId}, target: ${instanceId ?? 'unknown'}).`,
    };
  }

  if (clipboard.operation === 'copy') {
    return {
      ok: false,
      reason: 'Copy (duplicate) paste is not yet supported. Use cut + paste instead.',
    };
  }

  const appliedMoves: Array<{ nodeId: MasterTreeId; targetParentId: MasterTreeId | null }> = [];

  for (const nodeId of clipboard.nodeIds) {
    const result: MasterFolderTreeActionResult = await controller.moveNode(nodeId, targetParentId);
    if (!result.ok) {
      return {
        ok: false,
        reason: result.error?.message ?? `Failed to move node ${nodeId}.`,
      };
    }
    appliedMoves.push({ nodeId, targetParentId });
  }

  return { ok: true, appliedMoves };
};
