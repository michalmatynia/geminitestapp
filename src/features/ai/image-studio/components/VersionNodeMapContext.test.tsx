// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVersionNodeMapContext, VersionNodeMapProvider } from './VersionNodeMapContext';

const createVersionNodeMapValue = () =>
  ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    hoveredNodeId: null,
    mergeMode: false,
    mergeSelectedIds: [],
    collapsedNodeIds: new Set<string>(),
    filteredNodeIds: null,
    isolatedNodeIds: null,
    compositeMode: false,
    compositeSelectedIds: [],
    compareMode: false,
    compareNodeIds: null,
    onSelectNode: vi.fn(),
    onHoverNode: vi.fn(),
    onActivateNode: vi.fn(),
    onOpenNodeDetails: vi.fn(),
    onToggleMergeSelection: vi.fn(),
    onToggleCompositeSelection: vi.fn(),
    onToggleCollapse: vi.fn(),
    onReorderCompositeLayer: vi.fn(),
    onContextMenu: vi.fn(),
    getSlotImageSrc: vi.fn().mockReturnValue(null),
    getSlotAnnotation: vi.fn().mockReturnValue(undefined),
    zoom: 1,
    onZoomChange: vi.fn(),
    pan: { x: 0, y: 0 },
    viewportWidth: 800,
    viewportHeight: 600,
    onPanTo: vi.fn(),
  }) satisfies React.ComponentProps<typeof VersionNodeMapProvider>['value'];

describe('VersionNodeMapContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useVersionNodeMapContext())).toThrow(
      'useVersionNodeMapContext must be used inside VersionNodeMapProvider'
    );
  });

  it('returns the provided node-map runtime', () => {
    const value = createVersionNodeMapValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VersionNodeMapProvider value={value}>{children}</VersionNodeMapProvider>
    );

    const { result } = renderHook(() => useVersionNodeMapContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
