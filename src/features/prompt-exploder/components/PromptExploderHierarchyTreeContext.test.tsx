// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  PromptExploderHierarchyTreeProvider,
  usePromptExploderHierarchyTreeContext,
} from './PromptExploderHierarchyTreeContext';

describe('PromptExploderHierarchyTreeContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => usePromptExploderHierarchyTreeContext())).toThrow(
      'usePromptExploderHierarchyTreeContext must be used inside PromptExploderHierarchyTreeProvider'
    );
  });

  it('returns the runtime value inside the provider', () => {
    const value = {
      items: [
        {
          id: 'item-1',
          text: 'Alpha',
          logicalOperator: null,
          logicalConditions: [],
          referencedParamPath: null,
          referencedComparator: null,
          referencedValue: null,
          children: [],
        },
      ],
      onChange: vi.fn(),
      emptyLabel: 'No items yet',
      renderLogicalEditor: vi.fn(() => null),
    };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PromptExploderHierarchyTreeProvider value={value}>{children}</PromptExploderHierarchyTreeProvider>
    );

    const { result } = renderHook(() => usePromptExploderHierarchyTreeContext(), { wrapper });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.emptyLabel).toBe('No items yet');
    expect(result.current.onChange).toBe(value.onChange);
    expect(result.current.renderLogicalEditor).toBe(value.renderLogicalEditor);
  });
});
