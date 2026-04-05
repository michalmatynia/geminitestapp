// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AdminAiPathsValidationProvider,
  useAdminAiPathsValidationContext,
} from '../AdminAiPathsValidationContext';

const mocks = vi.hoisted(() => ({
  useAdminAiPathsValidationState: vi.fn(),
}));

vi.mock('../../hooks/useAdminAiPathsValidationState', () => ({
  useAdminAiPathsValidationState: (...args: unknown[]) =>
    mocks.useAdminAiPathsValidationState(...args),
}));

describe('AdminAiPathsValidationContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useAdminAiPathsValidationContext())).toThrow(
      'useAdminAiPathsValidationContext must be used within AdminAiPathsValidationProvider'
    );
  });

  it('provides the runtime value from useAdminAiPathsValidationState', () => {
    const value = {
      config: { allowWarnings: true },
      isDirty: false,
      save: vi.fn(),
    } as never;

    mocks.useAdminAiPathsValidationState.mockReturnValue(value);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminAiPathsValidationProvider>{children}</AdminAiPathsValidationProvider>
    );

    const { result } = renderHook(() => useAdminAiPathsValidationContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
