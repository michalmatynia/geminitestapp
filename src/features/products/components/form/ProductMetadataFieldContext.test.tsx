// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ProductMetadataFieldProvider,
  useOptionalProductMetadataFieldActionsContext,
  useOptionalProductMetadataFieldStateContext,
} from './ProductMetadataFieldContext';

describe('ProductMetadataFieldContext', () => {
  it('returns null from optional hooks outside the provider', () => {
    const { result } = renderHook(() => ({
      actions: useOptionalProductMetadataFieldActionsContext(),
      state: useOptionalProductMetadataFieldStateContext(),
    }));

    expect(result.current.state).toBeNull();
    expect(result.current.actions).toBeNull();
  });

  it('provides split state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProductMetadataFieldProvider
        value={{
          catalogs: [],
          catalogsLoading: false,
          categories: [],
          categoriesLoading: false,
          onCatalogsChange: vi.fn(),
          onCategoryChange: vi.fn(),
          onProducersChange: vi.fn(),
          onTagsChange: vi.fn(),
          producers: [],
          producersLoading: false,
          selectedCategoryId: null,
          selectedCatalogIds: [],
          selectedProducerIds: [],
          selectedTagIds: [],
          tags: [],
          tagsLoading: false,
        }}
      >
        {children}
      </ProductMetadataFieldProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useOptionalProductMetadataFieldActionsContext(),
        state: useOptionalProductMetadataFieldStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      catalogs: [],
      categories: [],
      producers: [],
      selectedCategoryId: null,
      tags: [],
    });
    expect(result.current.actions?.onCatalogsChange).toBeTypeOf('function');
    expect(result.current.actions?.onCategoryChange).toBeTypeOf('function');
    expect(result.current.actions?.onTagsChange).toBeTypeOf('function');
    expect(result.current.actions?.onProducersChange).toBeTypeOf('function');
  });
});
