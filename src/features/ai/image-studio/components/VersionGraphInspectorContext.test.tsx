// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useVersionGraphInspectorContext,
  VersionGraphInspectorProvider,
} from './VersionGraphInspectorContext';

const createInspectorValue = () =>
  ({
    selectedNode: null,
    compositeLoading: false,
    compositeBusy: false,
    getSlotImageSrc: vi.fn().mockReturnValue(null),
    onFlattenComposite: vi.fn(),
    onRefreshCompositePreview: vi.fn(),
    onSelectNode: vi.fn(),
    onOpenDetails: vi.fn(),
    onFocusNode: vi.fn(),
    onIsolateBranch: vi.fn(),
    annotationDraft: '',
    onAnnotationChange: vi.fn(),
    onAnnotationBlur: vi.fn(),
  }) satisfies React.ComponentProps<typeof VersionGraphInspectorProvider>['value'];

describe('VersionGraphInspectorContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useVersionGraphInspectorContext())).toThrow(
      'useVersionGraphInspectorContext must be used inside VersionGraphInspectorProvider'
    );
  });

  it('returns the provided inspector runtime', () => {
    const value = createInspectorValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VersionGraphInspectorProvider value={value}>{children}</VersionGraphInspectorProvider>
    );

    const { result } = renderHook(() => useVersionGraphInspectorContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
