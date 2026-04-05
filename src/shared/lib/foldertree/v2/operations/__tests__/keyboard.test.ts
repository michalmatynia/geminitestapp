import { describe, expect, it } from 'vitest';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { ResolvedFolderTreeKeyboardConfig } from '@/shared/utils/folder-tree-profiles-v2';

import { resolveKeyboardAction } from '../keyboard';
import type { FolderTreeNodeView } from '../../types';

const DEFAULT_KEYBOARD: ResolvedFolderTreeKeyboardConfig = {
  enabled: true,
  arrowNavigation: true,
  enterToRename: true,
  deleteKey: false,
};

const makeRow = (nodeId: string, opts: Partial<FolderTreeNodeView> = {}): FolderTreeNodeView => ({
  nodeId,
  depth: 0,
  parentId: null,
  hasChildren: false,
  isExpanded: false,
  ...opts,
});

const makeController = (
  overrides: Partial<MasterFolderTreeController>
): MasterFolderTreeController =>
  ({
    selectedNodeId: null,
    renamingNodeId: null,
    nodes: [],
    roots: [],
    ...overrides,
  }) as unknown as MasterFolderTreeController;

const makeEvent = (key: string, opts: Partial<KeyboardEvent> = {}): KeyboardEvent =>
  ({
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...opts,
  }) as KeyboardEvent;

const resolve = ({
  event,
  controller,
  visibleRows,
  keyboard,
  allowSelectAll,
}: {
  event: KeyboardEvent;
  controller: MasterFolderTreeController;
  visibleRows: FolderTreeNodeView[];
  keyboard?: ResolvedFolderTreeKeyboardConfig;
  allowSelectAll?: boolean;
}) =>
  resolveKeyboardAction({
    event,
    controller,
    visibleRows,
    keyboard: keyboard ?? DEFAULT_KEYBOARD,
    allowSelectAll: allowSelectAll ?? false,
  });

describe('resolveKeyboardAction', () => {
  const rows: FolderTreeNodeView[] = [
    makeRow('a'),
    makeRow('b'),
    makeRow('c', { hasChildren: true }),
    makeRow('d', { hasChildren: true, isExpanded: true }),
    makeRow('d-child', { depth: 1, parentId: 'd' }),
  ];

  it('returns null for unrelated keys', () => {
    const controller = makeController({ selectedNodeId: 'a' });
    expect(resolve({ event: makeEvent('Tab'), controller, visibleRows: rows })).toBeNull();
    expect(resolve({ event: makeEvent('Space'), controller, visibleRows: rows })).toBeNull();
  });

  it('returns null when modifier keys are held (except select all shortcut)', () => {
    const controller = makeController({ selectedNodeId: 'a' });
    expect(
      resolve({
        event: makeEvent('ArrowDown', { ctrlKey: true }),
        controller,
        visibleRows: rows,
      })
    ).toBeNull();
    expect(
      resolve({
        event: makeEvent('ArrowDown', { metaKey: true }),
        controller,
        visibleRows: rows,
      })
    ).toBeNull();
  });

  it('resolves select_all for Ctrl/Cmd+A only when allowed', () => {
    const controller = makeController({ selectedNodeId: 'a' });
    expect(
      resolve({
        event: makeEvent('a', { ctrlKey: true }),
        controller,
        visibleRows: rows,
        allowSelectAll: true,
      })
    ).toEqual({ type: 'select_all' });

    expect(
      resolve({
        event: makeEvent('a', { metaKey: true }),
        controller,
        visibleRows: rows,
        allowSelectAll: true,
      })
    ).toEqual({ type: 'select_all' });

    expect(
      resolve({
        event: makeEvent('a', { ctrlKey: true }),
        controller,
        visibleRows: rows,
        allowSelectAll: false,
      })
    ).toBeNull();

    expect(
      resolve({
        event: makeEvent('a', { ctrlKey: true, shiftKey: true }),
        controller,
        visibleRows: rows,
        allowSelectAll: true,
      })
    ).toBeNull();
  });

  it('selects next and previous rows with arrow keys', () => {
    expect(
      resolve({
        event: makeEvent('ArrowDown'),
        controller: makeController({ selectedNodeId: 'a' }),
        visibleRows: rows,
      })
    ).toEqual({ type: 'select', nodeId: 'b' });

    expect(
      resolve({
        event: makeEvent('ArrowUp'),
        controller: makeController({ selectedNodeId: 'b' }),
        visibleRows: rows,
      })
    ).toEqual({ type: 'select', nodeId: 'a' });
  });

  it('selects first/last rows on Home/End when arrow navigation is enabled', () => {
    expect(
      resolve({
        event: makeEvent('Home'),
        controller: makeController({ selectedNodeId: 'c' }),
        visibleRows: rows,
      })
    ).toEqual({ type: 'select', nodeId: 'a' });

    expect(
      resolve({
        event: makeEvent('End'),
        controller: makeController({ selectedNodeId: 'a' }),
        visibleRows: rows,
      })
    ).toEqual({ type: 'select', nodeId: 'd-child' });
  });

  it('handles expand/collapse and child traversal with left/right arrows', () => {
    expect(
      resolve({
        event: makeEvent('ArrowRight'),
        controller: makeController({ selectedNodeId: 'c' }),
        visibleRows: rows,
      })
    ).toEqual({ type: 'expand', nodeId: 'c' });

    expect(
      resolve({
        event: makeEvent('ArrowRight'),
        controller: makeController({ selectedNodeId: 'd' }),
        visibleRows: rows,
      })
    ).toEqual({ type: 'select', nodeId: 'd-child' });

    expect(
      resolve({
        event: makeEvent('ArrowLeft'),
        controller: makeController({ selectedNodeId: 'd' }),
        visibleRows: rows,
      })
    ).toEqual({ type: 'collapse', nodeId: 'd' });

    expect(
      resolve({
        event: makeEvent('ArrowLeft'),
        controller: makeController({ selectedNodeId: 'd-child' }),
        visibleRows: rows,
      })
    ).toEqual({ type: 'select', nodeId: 'd' });
  });

  it('gates arrow/home/end behavior when arrowNavigation is disabled', () => {
    const keyboard = { ...DEFAULT_KEYBOARD, arrowNavigation: false };
    const controller = makeController({ selectedNodeId: 'a' });

    expect(
      resolve({ event: makeEvent('ArrowDown'), controller, visibleRows: rows, keyboard })
    ).toBeNull();
    expect(
      resolve({ event: makeEvent('ArrowUp'), controller, visibleRows: rows, keyboard })
    ).toBeNull();
    expect(
      resolve({ event: makeEvent('Home'), controller, visibleRows: rows, keyboard })
    ).toBeNull();
    expect(
      resolve({ event: makeEvent('End'), controller, visibleRows: rows, keyboard })
    ).toBeNull();

    expect(
      resolve({
        event: makeEvent('ArrowDown'),
        controller: makeController({ selectedNodeId: null }),
        visibleRows: rows,
        keyboard,
      })
    ).toBeNull();
  });

  it('gates rename action by enterToRename flag', () => {
    const controller = makeController({ selectedNodeId: 'a' });

    expect(resolve({ event: makeEvent('Enter'), controller, visibleRows: rows })).toEqual({
      type: 'start_rename',
      nodeId: 'a',
    });

    expect(
      resolve({
        event: makeEvent('Enter'),
        controller,
        visibleRows: rows,
        keyboard: { ...DEFAULT_KEYBOARD, enterToRename: false },
      })
    ).toBeNull();
  });

  it('gates delete request by deleteKey flag', () => {
    const controller = makeController({ selectedNodeId: 'b' });

    expect(resolve({ event: makeEvent('Delete'), controller, visibleRows: rows })).toBeNull();

    expect(
      resolve({
        event: makeEvent('Delete'),
        controller,
        visibleRows: rows,
        keyboard: { ...DEFAULT_KEYBOARD, deleteKey: true },
      })
    ).toEqual({ type: 'request_delete', nodeId: 'b' });
  });

  describe('when renaming', () => {
    it('commits rename on Enter', () => {
      const controller = makeController({ selectedNodeId: 'a', renamingNodeId: 'a' });
      expect(resolve({ event: makeEvent('Enter'), controller, visibleRows: rows })).toEqual({
        type: 'commit_rename',
      });
    });

    it('cancels rename on Escape', () => {
      const controller = makeController({ selectedNodeId: 'a', renamingNodeId: 'a' });
      expect(resolve({ event: makeEvent('Escape'), controller, visibleRows: rows })).toEqual({
        type: 'cancel_rename',
      });
    });

    it('returns null for non-rename keys while renaming', () => {
      const controller = makeController({ selectedNodeId: 'a', renamingNodeId: 'a' });
      expect(resolve({ event: makeEvent('ArrowDown'), controller, visibleRows: rows })).toBeNull();
    });
  });

  it('selects first visible node on ArrowDown when nothing selected', () => {
    const controller = makeController({ selectedNodeId: null });
    expect(resolve({ event: makeEvent('ArrowDown'), controller, visibleRows: rows })).toEqual({
      type: 'select',
      nodeId: 'a',
    });
  });
});
