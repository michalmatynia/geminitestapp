// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';

import {
  ProductImageManagerUIProvider,
  useProductImageManagerUIActions,
  useProductImageManagerUIState,
} from './ProductImageManagerUIContext';

const buildController = (): ProductImageManagerController => ({
  imageSlots: [null],
  imageLinks: [''],
  imageBase64s: [''],
  setImageLinkAt: vi.fn(),
  setImageBase64At: vi.fn(),
  handleSlotImageChange: vi.fn(),
  handleSlotDisconnectImage: vi.fn(),
  setShowFileManager: vi.fn(),
  swapImageSlots: vi.fn(),
  setImagesReordering: vi.fn(),
});

describe('ProductImageManagerUIContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useProductImageManagerUIState())).toThrow(
      'useProductImageManagerUIState must be used within ProductImageManagerUIProvider'
    );
    expect(() => renderHook(() => useProductImageManagerUIActions())).toThrow(
      'useProductImageManagerUIActions must be used within ProductImageManagerUIProvider'
    );
  });

  it('returns UI state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProductImageManagerUIProvider
        externalBaseUrl='http://localhost'
        explicitController={buildController()}
      >
        {children}
      </ProductImageManagerUIProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useProductImageManagerUIActions(),
        state: useProductImageManagerUIState(),
      }),
      { wrapper }
    );

    expect(result.current.state.externalBaseUrl).toBe('http://localhost');
    expect(result.current.state.controller.imageSlots).toHaveLength(1);
    expect(result.current.actions.handleSlotFileUpload).toBeTypeOf('function');
    expect(result.current.actions.clearVisibleImage).toBeTypeOf('function');
  });
});
