import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  ProductListingJobsPanelViewProvider,
  useProductListingJobsPanelView,
} from '@/shared/lib/jobs/components/context/ProductListingJobsPanelViewContext';

describe('ProductListingJobsPanelViewContext', () => {
  it('returns the provided panel view state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProductListingJobsPanelViewProvider value={{ showBackToProducts: true }}>
        {children}
      </ProductListingJobsPanelViewProvider>
    );

    const { result } = renderHook(() => useProductListingJobsPanelView(), { wrapper });

    expect(result.current).toEqual({ showBackToProducts: true });
  });

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useProductListingJobsPanelView())).toThrow(
      'useProductListingJobsPanelView must be used within ProductListingJobsPanelViewProvider'
    );
  });
});
