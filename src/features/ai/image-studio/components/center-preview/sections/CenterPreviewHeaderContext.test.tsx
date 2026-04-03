// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CenterPreviewHeaderSectionProvider,
  useCenterPreviewHeaderContext,
} from './CenterPreviewHeaderContext';

describe('CenterPreviewHeaderContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useCenterPreviewHeaderContext())).toThrow(
      'useCenterPreviewHeaderContext must be used within CenterPreviewHeaderSectionProvider'
    );
  });

  it('returns the provided header actions', () => {
    const value = { onSaveScreenshot: vi.fn() };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CenterPreviewHeaderSectionProvider value={value}>
        {children}
      </CenterPreviewHeaderSectionProvider>
    );

    const { result } = renderHook(() => useCenterPreviewHeaderContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
