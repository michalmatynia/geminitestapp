// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VectorOverlayContext, useVectorOverlay } from './VectorOverlayContext';

describe('VectorOverlayContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useVectorOverlay())).toThrow(
      'useVectorOverlay must be used within PageBuilderProvider'
    );
  });

  it('returns the overlay value inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VectorOverlayContext.Provider
        value={{
          clearOverlay: vi.fn(),
          requestOverlay: vi.fn(),
          result: null,
        }}
      >
        {children}
      </VectorOverlayContext.Provider>
    );

    const { result } = renderHook(() => useVectorOverlay(), { wrapper });

    expect(result.current.result).toBeNull();
    expect(result.current.requestOverlay).toBeTypeOf('function');
    expect(result.current.clearOverlay).toBeTypeOf('function');
  });
});
