import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVersionGraphShortcuts } from '../useVersionGraphShortcuts';
import type { VersionNode } from '../../utils/version-graph';

const createNode = (id: string): VersionNode =>
  ({
    id,
    label: id,
    type: 'base',
    parentIds: [],
    childIds: [],
    hasMask: false,
    slot: {} as VersionNode['slot'],
    depth: 0,
    x: 0,
    y: 0,
    descendantCount: 0,
  }) satisfies VersionNode;

const createParams = () => ({
  mergeMode: false,
  compositeMode: false,
  compareMode: false,
  isolatedNodeId: null,
  selectedNodeId: 'node-1',
  nodes: [createNode('node-1')],
  toggleMergeMode: vi.fn(),
  toggleCompositeMode: vi.fn(),
  toggleCompareMode: vi.fn(),
  isolateBranch: vi.fn(),
  selectNode: vi.fn(),
  setAnnotation: vi.fn(async () => undefined),
  setAnnotationDraft: vi.fn(),
  fitToView: vi.fn(),
  focusNode: vi.fn(),
});

describe('useVersionGraphShortcuts', () => {
  it('does not hijack Enter on skip links or other interactive controls', () => {
    const params = createParams();
    const { result } = renderHook(() => useVersionGraphShortcuts(params));
    const skipLink = document.createElement('a');
    skipLink.href = '#app-content';

    result.current({
      key: 'Enter',
      preventDefault: vi.fn(),
      target: skipLink,
    });

    expect(params.focusNode).not.toHaveBeenCalled();
  });

  it('still focuses the selected node for non-interactive targets', () => {
    const params = createParams();
    const { result } = renderHook(() => useVersionGraphShortcuts(params));
    const canvasSurface = document.createElement('div');

    result.current({
      key: 'Enter',
      preventDefault: vi.fn(),
      target: canvasSurface,
    });

    expect(params.focusNode).toHaveBeenCalledWith('node-1');
  });
});
