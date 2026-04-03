// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useVersionGraphCompareContext,
  VersionGraphCompareProvider,
} from './VersionGraphCompareContext';

const createCompareValue = () =>
  ({
    compareNodes: [{ id: 'a' }, { id: 'b' }] as never,
    getSlotImageSrc: vi.fn().mockReturnValue(null),
    onOpenDetails: vi.fn(),
    onSwap: vi.fn(),
    onExit: vi.fn(),
  }) satisfies React.ComponentProps<typeof VersionGraphCompareProvider>['value'];

describe('VersionGraphCompareContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useVersionGraphCompareContext())).toThrow(
      'useVersionGraphCompareContext must be used inside VersionGraphCompareProvider'
    );
  });

  it('returns the provided compare runtime', () => {
    const value = createCompareValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VersionGraphCompareProvider value={value}>{children}</VersionGraphCompareProvider>
    );

    const { result } = renderHook(() => useVersionGraphCompareContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
