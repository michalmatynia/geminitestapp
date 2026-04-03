// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CatalogModalProvider, useCatalogModalContext } from './CatalogModalContext';

describe('CatalogModalContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useCatalogModalContext())).toThrow(
      'useCatalogModalContext must be used within CatalogModalProvider'
    );
  });

  it('returns the modal value inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CatalogModalProvider
        value={{
          availableLanguages: [],
          catalogDefaultPriceGroupId: '',
          catalogPriceGroupIds: [],
          defaultLanguageId: '',
          error: null,
          form: {
            description: '',
            isDefault: false,
            name: 'Main catalog',
          },
          getLanguage: vi.fn(),
          languageQuery: '',
          languagesError: null,
          languagesLoading: false,
          loadingGroups: false,
          moveLanguage: vi.fn(),
          priceGroups: [],
          selectedLanguageIds: [],
          setCatalogDefaultPriceGroupId: vi.fn(),
          setDefaultLanguageId: vi.fn(),
          setForm: vi.fn(),
          setLanguageQuery: vi.fn(),
          toggleLanguage: vi.fn(),
          togglePriceGroup: vi.fn(),
        }}
      >
        {children}
      </CatalogModalProvider>
    );

    const { result } = renderHook(() => useCatalogModalContext(), { wrapper });

    expect(result.current.form).toMatchObject({
      description: '',
      isDefault: false,
      name: 'Main catalog',
    });
    expect(result.current.setForm).toBeTypeOf('function');
    expect(result.current.toggleLanguage).toBeTypeOf('function');
  });
});
