// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CenterPreviewCanvasSectionProvider,
  useCenterPreviewCanvasContext,
} from './CenterPreviewCanvasContext';

const createCenterPreviewCanvasValue = () =>
  ({
    vectorContextValue: {} as never,
    projectCanvasSize: { width: 1024, height: 1024 },
    activeCanvasImageSrc: 'https://example.com/image.png',
    liveMaskShapes: [],
    splitVariantView: false,
    canCompareSelectedVariants: false,
    compareVariantImageA: null,
    compareVariantImageB: null,
    canCompareWithSource: false,
    sourceSlotImageSrc: null,
    workingSlotImageSrc: null,
    isCompositeSlot: false,
    canNavigateToSource: false,
    canRevealLoadedCardInTree: false,
    onPreviewCanvasCropRectChange: vi.fn(),
    onPreviewCanvasImageFrameChange: vi.fn(),
    onGoToSourceSlot: vi.fn(),
    onToggleSourceVariantView: vi.fn(),
    onToggleSplitVariantView: vi.fn(),
    onRevealInTreeFromCanvas: vi.fn(),
  }) satisfies React.ComponentProps<typeof CenterPreviewCanvasSectionProvider>['value'];

describe('CenterPreviewCanvasContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useCenterPreviewCanvasContext())).toThrow(
      'useCenterPreviewCanvasContext must be used within CenterPreviewCanvasSectionProvider'
    );
  });

  it('returns the provided canvas runtime', () => {
    const value = createCenterPreviewCanvasValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CenterPreviewCanvasSectionProvider value={value}>
        {children}
      </CenterPreviewCanvasSectionProvider>
    );

    const { result } = renderHook(() => useCenterPreviewCanvasContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
