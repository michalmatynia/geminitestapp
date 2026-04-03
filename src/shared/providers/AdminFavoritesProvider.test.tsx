// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminFavoritesProvider, useAdminFavorites } from './AdminFavoritesProvider';

describe('AdminFavoritesProvider', () => {
  it('returns the fallback value outside the provider', () => {
    const { result } = renderHook(() => useAdminFavorites());

    expect(result.current.favoritesKey).toBe('');
    expect(result.current.candidates).toEqual([]);
    expect(result.current.resolveCandidate('/admin', new URLSearchParams())).toBeNull();
  });

  it('returns the provider value when present', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminFavoritesProvider
        value={{
          candidates: [{ id: 'products', label: 'Products' }],
          favoritesKey: 'admin:favorites',
          resolveCandidate: () => ({ id: 'products', label: 'Products' }),
        }}
      >
        {children}
      </AdminFavoritesProvider>
    );

    const { result } = renderHook(() => useAdminFavorites(), { wrapper });

    expect(result.current.favoritesKey).toBe('admin:favorites');
    expect(result.current.candidates).toEqual([{ id: 'products', label: 'Products' }]);
    expect(result.current.resolveCandidate('/admin/products', new URLSearchParams())).toEqual({
      id: 'products',
      label: 'Products',
    });
  });
});
