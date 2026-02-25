import { describe, expect, it } from 'vitest';

import {
  canStartCaseResolverTreeNodeDrag,
  isCaseResolverDraggableFileNode,
} from '@/features/case-resolver/components/CaseResolverFolderTree.helpers';

describe('case resolver folder tree drag handle', () => {
  it('blocks file drag when not armed and not dragged from handle', () => {
    expect(
      canStartCaseResolverTreeNodeDrag({
        nodeType: 'file',
        nodeId: 'file-a',
        isVirtualSectionNode: false,
        fromHandleGesture: false,
        armedNodeId: null,
      })
    ).toBe(false);
  });

  it('allows file drag when started from handle gesture', () => {
    expect(
      canStartCaseResolverTreeNodeDrag({
        nodeType: 'file',
        nodeId: 'file-a',
        isVirtualSectionNode: false,
        fromHandleGesture: true,
        armedNodeId: null,
      })
    ).toBe(true);
  });

  it('allows file drag when node is already armed', () => {
    expect(
      canStartCaseResolverTreeNodeDrag({
        nodeType: 'file',
        nodeId: 'file-a',
        isVirtualSectionNode: false,
        fromHandleGesture: false,
        armedNodeId: 'file-a',
      })
    ).toBe(true);
    expect(
      canStartCaseResolverTreeNodeDrag({
        nodeType: 'file',
        nodeId: 'file-a',
        isVirtualSectionNode: false,
        fromHandleGesture: false,
        armedNodeId: 'file-b',
      })
    ).toBe(false);
  });

  it('allows folder drag regardless of handle arming', () => {
    expect(
      canStartCaseResolverTreeNodeDrag({
        nodeType: 'folder',
        nodeId: 'folder-a',
        isVirtualSectionNode: false,
        fromHandleGesture: false,
        armedNodeId: null,
      })
    ).toBe(true);
  });

  it('blocks child-structure nodes from drag start', () => {
    expect(
      canStartCaseResolverTreeNodeDrag({
        nodeType: 'file',
        nodeId: 'file-a',
        isVirtualSectionNode: true,
        fromHandleGesture: true,
        armedNodeId: 'file-a',
      })
    ).toBe(false);
    expect(
      canStartCaseResolverTreeNodeDrag({
        nodeType: 'folder',
        nodeId: 'folder-a',
        isVirtualSectionNode: true,
        fromHandleGesture: true,
        armedNodeId: 'folder-a',
      })
    ).toBe(false);
  });

  it('marks all non-case files as draggable handle nodes', () => {
    expect(
      isCaseResolverDraggableFileNode({
        nodeType: 'file',
        fileType: 'document',
        isVirtualSectionNode: false,
      })
    ).toBe(true);
    expect(
      isCaseResolverDraggableFileNode({
        nodeType: 'file',
        fileType: 'scanfile',
        isVirtualSectionNode: false,
      })
    ).toBe(true);
    expect(
      isCaseResolverDraggableFileNode({
        nodeType: 'file',
        fileType: '',
        isVirtualSectionNode: false,
      })
    ).toBe(true);
    expect(
      isCaseResolverDraggableFileNode({
        nodeType: 'file',
        fileType: 'case',
        isVirtualSectionNode: false,
      })
    ).toBe(false);
    expect(
      isCaseResolverDraggableFileNode({
        nodeType: 'folder',
        fileType: '',
        isVirtualSectionNode: false,
      })
    ).toBe(false);
  });
});
