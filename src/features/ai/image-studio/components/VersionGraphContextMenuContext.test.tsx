// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useVersionGraphContextMenuContext,
  VersionGraphContextMenuProvider,
} from './VersionGraphContextMenuContext';

const createContextMenuValue = () =>
  ({
    menu: { nodeId: 'node-1', x: 10, y: 20 },
    node: { id: 'node-1' },
    collapsedNodeIds: new Set<string>(),
    onClose: vi.fn(),
    onDetachSubtree: vi.fn(),
    onIsolateBranch: vi.fn(),
    onToggleCollapse: vi.fn(),
    onAddToComposite: vi.fn(),
    onCompareWith: vi.fn(),
    onCopyId: vi.fn(),
  }) satisfies React.ComponentProps<typeof VersionGraphContextMenuProvider>['value'];

describe('VersionGraphContextMenuContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useVersionGraphContextMenuContext())).toThrow(
      'useVersionGraphContextMenuContext must be used inside VersionGraphContextMenuProvider'
    );
  });

  it('returns the provided context-menu runtime', () => {
    const value = createContextMenuValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VersionGraphContextMenuProvider value={value}>{children}</VersionGraphContextMenuProvider>
    );

    const { result } = renderHook(() => useVersionGraphContextMenuContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
