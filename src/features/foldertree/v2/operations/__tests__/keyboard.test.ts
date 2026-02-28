import { describe, expect, it } from 'vitest';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';

import { resolveKeyboardAction } from '../keyboard';
import type { FolderTreeNodeView } from '../../types';

const makeRow = (
  nodeId: string,
  opts: Partial<FolderTreeNodeView> = {}
): FolderTreeNodeView => ({
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
  ({ key, metaKey: false, ctrlKey: false, altKey: false, ...opts }) as KeyboardEvent;

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
    expect(resolveKeyboardAction({ event: makeEvent('Tab'), controller, visibleRows: rows })).toBeNull();
    expect(resolveKeyboardAction({ event: makeEvent('Space'), controller, visibleRows: rows })).toBeNull();
  });

  it('returns null when modifier keys are held', () => {
    const controller = makeController({ selectedNodeId: 'a' });
    expect(resolveKeyboardAction({ event: makeEvent('ArrowDown', { ctrlKey: true }), controller, visibleRows: rows })).toBeNull();
    expect(resolveKeyboardAction({ event: makeEvent('ArrowDown', { metaKey: true }), controller, visibleRows: rows })).toBeNull();
  });

  it('selects next node on ArrowDown', () => {
    const controller = makeController({ selectedNodeId: 'a' });
    const action = resolveKeyboardAction({ event: makeEvent('ArrowDown'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'select', nodeId: 'b' });
  });

  it('selects previous node on ArrowUp', () => {
    const controller = makeController({ selectedNodeId: 'b' });
    const action = resolveKeyboardAction({ event: makeEvent('ArrowUp'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'select', nodeId: 'a' });
  });

  it('returns null when ArrowDown at end of list', () => {
    const controller = makeController({ selectedNodeId: 'd-child' });
    expect(resolveKeyboardAction({ event: makeEvent('ArrowDown'), controller, visibleRows: rows })).toBeNull();
  });

  it('expands collapsed folder on ArrowRight', () => {
    const controller = makeController({ selectedNodeId: 'c' });
    const action = resolveKeyboardAction({ event: makeEvent('ArrowRight'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'expand', nodeId: 'c' });
  });

  it('moves to first child when folder is expanded on ArrowRight', () => {
    const controller = makeController({ selectedNodeId: 'd' });
    const action = resolveKeyboardAction({ event: makeEvent('ArrowRight'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'select', nodeId: 'd-child' });
  });

  it('collapses expanded folder on ArrowLeft', () => {
    const controller = makeController({ selectedNodeId: 'd' });
    const action = resolveKeyboardAction({ event: makeEvent('ArrowLeft'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'collapse', nodeId: 'd' });
  });

  it('moves to parent on ArrowLeft for non-folder or collapsed node', () => {
    const controller = makeController({ selectedNodeId: 'd-child' });
    const action = resolveKeyboardAction({ event: makeEvent('ArrowLeft'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'select', nodeId: 'd' });
  });

  it('selects first node on Home', () => {
    const controller = makeController({ selectedNodeId: 'c' });
    const action = resolveKeyboardAction({ event: makeEvent('Home'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'select', nodeId: 'a' });
  });

  it('selects last node on End', () => {
    const controller = makeController({ selectedNodeId: 'a' });
    const action = resolveKeyboardAction({ event: makeEvent('End'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'select', nodeId: 'd-child' });
  });

  it('starts rename on Enter', () => {
    const controller = makeController({ selectedNodeId: 'a' });
    const action = resolveKeyboardAction({ event: makeEvent('Enter'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'start_rename', nodeId: 'a' });
  });

  it('emits request_delete on Delete', () => {
    const controller = makeController({ selectedNodeId: 'b' });
    const action = resolveKeyboardAction({ event: makeEvent('Delete'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'request_delete', nodeId: 'b' });
  });

  describe('when renaming', () => {
    it('commits rename on Enter', () => {
      const controller = makeController({ selectedNodeId: 'a', renamingNodeId: 'a' });
      const action = resolveKeyboardAction({ event: makeEvent('Enter'), controller, visibleRows: rows });
      expect(action).toEqual({ type: 'commit_rename' });
    });

    it('cancels rename on Escape', () => {
      const controller = makeController({ selectedNodeId: 'a', renamingNodeId: 'a' });
      const action = resolveKeyboardAction({ event: makeEvent('Escape'), controller, visibleRows: rows });
      expect(action).toEqual({ type: 'cancel_rename' });
    });

    it('returns null for arrow keys while renaming', () => {
      const controller = makeController({ selectedNodeId: 'a', renamingNodeId: 'a' });
      expect(resolveKeyboardAction({ event: makeEvent('ArrowDown'), controller, visibleRows: rows })).toBeNull();
    });
  });

  it('selects first visible node on ArrowDown when nothing selected', () => {
    const controller = makeController({ selectedNodeId: null });
    const action = resolveKeyboardAction({ event: makeEvent('ArrowDown'), controller, visibleRows: rows });
    expect(action).toEqual({ type: 'select', nodeId: 'a' });
  });
});
