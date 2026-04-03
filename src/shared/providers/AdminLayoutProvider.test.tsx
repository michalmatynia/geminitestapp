// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AdminLayoutProvider,
  useAdminLayoutActions,
  useAdminLayoutState,
} from './AdminLayoutProvider';

describe('AdminLayoutProvider', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useAdminLayoutState())).toThrow(
      'useAdminLayoutState must be used within AdminLayoutProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useAdminLayoutActions())).toThrow(
      'useAdminLayoutActions must be used within AdminLayoutProvider'
    );
  });

  it('provides initial state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminLayoutProvider initialMenuCollapsed>{children}</AdminLayoutProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useAdminLayoutActions(),
        state: useAdminLayoutState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      aiDrawerOpen: false,
      isMenuCollapsed: true,
      isMenuHidden: false,
      isProgrammaticallyCollapsed: false,
    });
    expect(result.current.actions.setIsMenuCollapsed).toBeTypeOf('function');
    expect(result.current.actions.setAiDrawerOpen).toBeTypeOf('function');
  });
});
