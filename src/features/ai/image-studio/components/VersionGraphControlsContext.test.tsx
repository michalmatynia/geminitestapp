// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useVersionGraphControlsContext,
  VersionGraphControlsProvider,
} from './VersionGraphControlsContext';

const createControlsValue = () =>
  ({
    nodeCount: 2,
    allNodeCount: 3,
    mergeMode: false,
    mergeSelectedIds: [],
    mergeBusy: false,
    onToggleMergeMode: vi.fn(),
    onClearMergeSelection: vi.fn(),
    onExecuteMerge: vi.fn(),
    compositeMode: false,
    compositeSelectedIds: [],
    compositeBusy: false,
    onToggleCompositeMode: vi.fn(),
    onClearCompositeSelection: vi.fn(),
    onExecuteComposite: vi.fn(),
    onCollapseAll: vi.fn(),
    onExpandAll: vi.fn(),
    layoutMode: 'dag',
    onSetLayoutMode: vi.fn(),
    zoom: 1,
    onSetZoom: vi.fn(),
    onFitToView: vi.fn(),
    showStats: false,
    onToggleStats: vi.fn(),
    compareMode: false,
    onToggleCompareMode: vi.fn(),
    showMinimap: false,
    onToggleMinimap: vi.fn(),
    showMinimapButton: true,
    exporting: false,
    onExportPng: vi.fn(),
    filterQuery: '',
    filterTypes: new Set(),
    filterHasMask: null,
    filterLeafOnly: false,
    hasActiveFilters: false,
    onSetFilterQuery: vi.fn(),
    onToggleFilterType: vi.fn(),
    onSetFilterHasMask: vi.fn(),
    onToggleLeafOnly: vi.fn(),
    onClearFilters: vi.fn(),
  }) satisfies React.ComponentProps<typeof VersionGraphControlsProvider>['value'];

describe('VersionGraphControlsContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useVersionGraphControlsContext())).toThrow(
      'useVersionGraphControlsContext must be used inside VersionGraphControlsProvider'
    );
  });

  it('returns the provided controls runtime', () => {
    const value = createControlsValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VersionGraphControlsProvider value={value}>{children}</VersionGraphControlsProvider>
    );

    const { result } = renderHook(() => useVersionGraphControlsContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
