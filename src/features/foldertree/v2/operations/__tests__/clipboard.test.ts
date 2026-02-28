import { describe, expect, it, vi } from 'vitest';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';

import { applyMasterTreePaste, captureMasterTreeClipboard } from '../clipboard';

const makeController = (
  moveNodeResult = { ok: true, success: true }
): MasterFolderTreeController =>
  ({
    moveNode: vi.fn(async () => moveNodeResult),
    nodes: [],
    roots: [],
  }) as unknown as MasterFolderTreeController;

describe('captureMasterTreeClipboard', () => {
  it('creates clipboard entry with correct shape', () => {
    const entry = captureMasterTreeClipboard(['a', 'b'], 'cut', 'notes');
    expect(entry.operation).toBe('cut');
    expect(entry.nodeIds).toEqual(['a', 'b']);
    expect(entry.sourceInstanceId).toBe('notes');
    expect(typeof entry.capturedAt).toBe('number');
  });

  it('does not mutate the input nodeIds array', () => {
    const ids = ['a', 'b'];
    const entry = captureMasterTreeClipboard(ids, 'cut', 'notes');
    ids.push('c');
    expect(entry.nodeIds).toHaveLength(2);
  });
});

describe('applyMasterTreePaste', () => {
  it('moves each node in clipboard to target parent', async () => {
    const controller = makeController();
    const clipboard = captureMasterTreeClipboard(['a', 'b'], 'cut', 'notes');
    const result = await applyMasterTreePaste({ clipboard, targetParentId: 'folder-x', controller, instanceId: 'notes' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appliedMoves).toHaveLength(2);
      expect(result.appliedMoves[0]).toEqual({ nodeId: 'a', targetParentId: 'folder-x' });
    }
    expect(controller.moveNode).toHaveBeenCalledTimes(2);
  });

  it('blocks cross-instance paste when allowCrossInstance is false', async () => {
    const controller = makeController();
    const clipboard = captureMasterTreeClipboard(['a'], 'cut', 'image_studio');
    const result = await applyMasterTreePaste({ clipboard, targetParentId: null, controller, instanceId: 'notes' });
    expect(result.ok).toBe(false);
    expect(controller.moveNode).not.toHaveBeenCalled();
  });

  it('allows cross-instance paste when allowCrossInstance is true', async () => {
    const controller = makeController();
    const clipboard = captureMasterTreeClipboard(['a'], 'cut', 'image_studio');
    const result = await applyMasterTreePaste({ clipboard, targetParentId: null, controller, instanceId: 'notes', allowCrossInstance: true });
    expect(result.ok).toBe(true);
    expect(controller.moveNode).toHaveBeenCalledTimes(1);
  });

  it('returns failure when copy operation requested', async () => {
    const controller = makeController();
    const clipboard = captureMasterTreeClipboard(['a'], 'copy', 'notes');
    const result = await applyMasterTreePaste({ clipboard, targetParentId: null, controller, instanceId: 'notes' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('copy');
    }
    expect(controller.moveNode).not.toHaveBeenCalled();
  });

  it('returns failure when a single move fails', async () => {
    const controller = makeController({ ok: false, success: false, error: { message: 'blocked', code: 'BLOCKED' } });
    const clipboard = captureMasterTreeClipboard(['a', 'b'], 'cut', 'notes');
    const result = await applyMasterTreePaste({ clipboard, targetParentId: null, controller, instanceId: 'notes' });
    expect(result.ok).toBe(false);
  });
});
