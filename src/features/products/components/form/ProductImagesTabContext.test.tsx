// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ProductImagesTabProvider,
  useOptionalProductImagesTabActionsContext,
  useOptionalProductImagesTabStateContext,
} from './ProductImagesTabContext';

describe('ProductImagesTabContext', () => {
  it('returns null from optional hooks outside the provider', () => {
    const { result } = renderHook(() => ({
      actions: useOptionalProductImagesTabActionsContext(),
      state: useOptionalProductImagesTabStateContext(),
    }));

    expect(result.current.state).toBeNull();
    expect(result.current.actions).toBeNull();
  });

  it('provides split state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProductImagesTabProvider
        value={{
          chooseButtonAriaLabel: 'Choose product images',
          chooseButtonLabel: 'Choose images',
          imageManagerController: undefined,
          inlineFileManager: false,
          onSelectFiles: vi.fn(),
          onShowFileManager: vi.fn(),
          sectionDescription: 'Select images for the product',
          sectionTitle: 'Images',
          showFileManager: true,
        }}
      >
        {children}
      </ProductImagesTabProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useOptionalProductImagesTabActionsContext(),
        state: useOptionalProductImagesTabStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      chooseButtonAriaLabel: 'Choose product images',
      chooseButtonLabel: 'Choose images',
      inlineFileManager: false,
      sectionDescription: 'Select images for the product',
      sectionTitle: 'Images',
      showFileManager: true,
    });
    expect(result.current.actions?.onShowFileManager).toBeTypeOf('function');
    expect(result.current.actions?.onSelectFiles).toBeTypeOf('function');
  });
});
