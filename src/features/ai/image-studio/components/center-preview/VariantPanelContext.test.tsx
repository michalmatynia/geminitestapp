// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVariantPanelContext, VariantPanelProvider } from './VariantPanelContext';

const createVariantPanelValue = () =>
  ({
    activeRunError: null,
    activeVariantId: 'variant-1',
    compareVariantA: null,
    compareVariantB: null,
    compareVariantIds: [null, null],
    deletePending: false,
    filteredVariantThumbnails: [],
    variantLoadingId: null,
    variantTimestampQuery: '',
    visibleVariantThumbnails: [],
    onClearCompare: vi.fn(),
    onDeleteVariant: vi.fn(),
    onDismissRunError: vi.fn(),
    onLoadVariantToCanvas: vi.fn().mockResolvedValue(undefined),
    onOpenVariantDetails: vi.fn(),
    onSetCompareVariantA: vi.fn(),
    onSetCompareVariantB: vi.fn(),
    onVariantTimestampQueryChange: vi.fn(),
    onVariantTooltipLeave: vi.fn(),
    onVariantTooltipMove: vi.fn(),
  }) satisfies React.ComponentProps<typeof VariantPanelProvider>['value'];

describe('VariantPanelContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useVariantPanelContext())).toThrow(
      'useVariantPanelContext must be used within VariantPanelProvider'
    );
  });

  it('returns the provided value', () => {
    const value = createVariantPanelValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VariantPanelProvider value={value}>{children}</VariantPanelProvider>
    );

    const { result } = renderHook(() => useVariantPanelContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
