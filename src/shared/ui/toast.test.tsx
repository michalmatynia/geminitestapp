// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ToastProvider,
  useOptionalToast,
  useToast,
  useToastSettings,
} from './toast';

describe('toast hooks', () => {
  it('throws outside the provider for strict hooks', () => {
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within a ToastProvider.'
    );
    expect(() => renderHook(() => useToastSettings())).toThrow(
      'useToastSettings must be used within a ToastProvider.'
    );
  });

  it('returns a no-op optional toast outside the provider', () => {
    const { result } = renderHook(() => useOptionalToast());
    expect(result.current.toast).toBeTypeOf('function');
    expect(() => result.current.toast('noop')).not.toThrow();
  });

  it('returns toast state and settings inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ToastProvider>{children}</ToastProvider>
    );

    const { result } = renderHook(
      () => ({
        optional: useOptionalToast(),
        settings: useToastSettings(),
        toast: useToast(),
      }),
      { wrapper }
    );

    expect(result.current.toast.toast).toBeTypeOf('function');
    expect(result.current.optional.toast).toBeTypeOf('function');
    expect(result.current.settings.settings).toMatchObject({
      accent: 'emerald',
      position: 'top-right',
    });
    expect(result.current.settings.updateSettings).toBeTypeOf('function');
  });
});
